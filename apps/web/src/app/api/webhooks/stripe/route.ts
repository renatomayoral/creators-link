import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { constructWebhookEvent, getStripe, type Stripe } from '@repo/payments'
import { sendCryptoAccessGranted, sendAccessExpired } from '@/lib/email'

const { vipSubscription, vipPlan, creator, payment } = schema

// Stripe needs the raw request body to verify the signature — never parse first.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = constructWebhookEvent(rawBody, signature)
  } catch (err) {
    console.error('stripe webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object)
        break
      case 'invoice.paid':
        await onInvoicePaid(event.data.object)
        break
      case 'customer.subscription.deleted':
        await onSubscriptionEnded(event.data.object, 'canceled')
        break
      case 'invoice.payment_failed':
        await onPaymentFailed(event.data.object)
        break
      default:
        // Unhandled events are acknowledged so Stripe stops retrying.
        break
    }
  } catch (err) {
    console.error(`stripe webhook handler error for ${event.type}`, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return

  const meta = session.metadata ?? {}
  const creatorId = meta['creatorId']
  const planId = meta['planId']
  if (!creatorId || !planId) {
    console.error('checkout.session.completed missing creatorId/planId metadata')
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id

  // Fetch the subscription to read the current period end for access expiry.
  const sub = await getStripe().subscriptions.retrieve(subscriptionId)
  const periodEnd = sub.items.data[0]?.current_period_end ?? null

  // Idempotent: the same subscription id can arrive more than once.
  const fanEmail = session.customer_details?.email ?? null
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null

  const existing = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.stripeSubscriptionId, subscriptionId),
  })
  if (existing) {
    await db
      .update(vipSubscription)
      .set({ status: 'active', currentPeriodEnd, updatedAt: new Date() })
      .where(eq(vipSubscription.id, existing.id))
    return
  }

  await db.insert(vipSubscription).values({
    id: randomUUID(),
    creatorId,
    planId,
    fanEmail,
    provider: 'stripe',
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    status: 'active',
    currentPeriodEnd,
  })

  await grantTelegramAccess({ creatorId, planId, fanEmail, periodEnd: currentPeriodEnd })
}

// Creates a single-use Telegram invite link for the creator's VIP channel and
// emails it to the fan. Mirrors the same Bot API flow used by the NOWPayments
// webhook (see apps/web/src/app/api/webhooks/nowpayments/route.ts).
async function grantTelegramAccess(params: {
  creatorId: string
  planId: string
  fanEmail: string | null
  periodEnd: Date | null
}) {
  const botToken = process.env['TELEGRAM_BOT_TOKEN']
  if (!botToken || !params.fanEmail) return

  const c = await db.query.creator.findFirst({ where: eq(creator.id, params.creatorId) })
  if (!c?.telegramChannelId) return

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, params.planId) })
  const periodEnd = params.periodEnd ?? new Date(Date.now() + 30 * 86400_000)

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: c.telegramChannelId,
        member_limit: 1,
        expire_date: Math.floor(periodEnd.getTime() / 1000),
      }),
    })
    const tgData = await tgRes.json()
    const inviteLink = tgData?.result?.invite_link
    if (!inviteLink) {
      console.error('[stripe webhook] createChatInviteLink returned no link', tgData)
      return
    }

    await sendCryptoAccessGranted({
      to: params.fanEmail,
      creatorName: c.name,
      planTitle: plan?.title ?? 'VIP',
      inviteLink,
      periodEnd,
    })
  } catch (err) {
    console.error('[stripe webhook] failed to grant Telegram access:', err)
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return

  const periodEnd = invoice.lines.data[0]?.period?.end ?? null
  await db
    .update(vipSubscription)
    .set({
      status: 'active',
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(vipSubscription.stripeSubscriptionId, subscriptionId))

  await recordPayment(invoice, subscriptionId)
}

// Persists a `payment` row for revenue reporting. Idempotent on
// stripeInvoiceId, since Stripe can redeliver the same webhook event.
async function recordPayment(invoice: Stripe.Invoice, subscriptionId: string) {
  if (!invoice.id) return

  const existing = await db.query.payment.findFirst({
    where: eq(payment.stripeInvoiceId, invoice.id),
  })
  if (existing) return

  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.stripeSubscriptionId, subscriptionId),
  })
  if (!sub) {
    console.error(`invoice.paid for unknown subscription ${subscriptionId}`)
    return
  }

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })

  // Read the platform's application fee off the underlying charge, so the
  // recorded fee always matches what Stripe actually withheld — not a
  // recomputed guess that could drift from TAKE_RATE_BPS over time.
  const chargeId = getInvoiceChargeId(invoice)
  let providerFeeCents = 0
  if (chargeId) {
    const charge = await getStripe().charges.retrieve(chargeId)
    providerFeeCents = charge.application_fee_amount ?? 0
  }

  await db.insert(payment).values({
    id: randomUUID(),
    creatorId: sub.creatorId,
    vipSubscriptionId: sub.id,
    fanEmail: sub.fanEmail,
    provider: 'stripe',
    source: plan ? `Telegram · ${plan.title}` : 'Telegram · VIP',
    stripeInvoiceId: invoice.id,
    currency: invoice.currency,
    grossCents: invoice.amount_paid,
    providerFeeCents,
    fxFeeCents: 0,
    status: 'paid',
    createdAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
  })
}

async function onSubscriptionEnded(sub: Stripe.Subscription, status: 'canceled' | 'expired') {
  await db
    .update(vipSubscription)
    .set({ status, updatedAt: new Date() })
    .where(eq(vipSubscription.stripeSubscriptionId, sub.id))

  await revokeTelegramAccess(sub.id)
}

// Sends the expiry email and logs the pending kick. Actually removing the fan
// from the Telegram channel requires the fan's Telegram user_id, which isn't
// captured anywhere yet (same gap as the NOWPayments webhook) — the invite
// link is single-use and time-limited in the meantime, so no new fan can join
// on it after expiry, but an already-joined fan isn't auto-kicked.
async function revokeTelegramAccess(stripeSubscriptionId: string) {
  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.stripeSubscriptionId, stripeSubscriptionId),
  })
  if (!sub?.fanEmail) return

  const c = await db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) })
  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

  await sendAccessExpired({
    to: sub.fanEmail,
    creatorName: c?.name ?? '',
    planTitle: plan?.title ?? 'VIP',
    renewLink: `${appUrl}/p/${c?.slug ?? ''}`,
  }).catch((err) => console.error('[stripe webhook] failed to send expiry email:', err))

  if (c?.telegramChannelId) {
    console.log('[stripe webhook] subscription ended — fan should be removed:', sub.fanEmail)
  }
}

async function onPaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return

  // Mark past_due but keep access until currentPeriodEnd (grace period).
  await db
    .update(vipSubscription)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(vipSubscription.stripeSubscriptionId, subscriptionId))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The subscription pointer moved around across Stripe API versions; read it
// defensively from the invoice.
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id: string } }).subscription
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.id
}

// The charge pointer similarly moved around across Stripe API versions.
function getInvoiceChargeId(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { charge?: string | { id: string } }).charge
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.id
}

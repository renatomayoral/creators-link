import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { verifyWebhookSignature } from '@/lib/boomfi'
import { sendCryptoAccessGranted, sendAccessExpired } from '@/lib/email'

const { vipSubscription, vipPlan, creator, payment, ppvPurchase, ppvContent } = schema

type BoomfiEvent = {
  event: string
  data: {
    id: string
    subscription_id?: string
    reference_id?: string
    status?: string
    amount?: string
    currency?: string
  }
}

// POST /api/webhooks/boomfi
// Handles Subscription.Updated / Subscription.Canceled / Payment.Updated events.
// Signature: https://docs.boomfi.xyz/docs/webhook-signatures (RSA-SHA256 over "timestamp.rawBody").
export async function POST(req: NextRequest) {
  const timestamp = req.headers.get('x-boomfi-timestamp') ?? ''
  const signature = req.headers.get('x-boomfi-signature') ?? ''
  const rawBody = await req.text()

  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: BoomfiEvent
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // PPV unlock payments are one-off pay links keyed by ppvPurchase.id
  // (passed as reference_id, no subscription_id) — handle them separately
  // from the VIP subscription flow below.
  if (payload.event === 'Payment.Updated' && payload.data.reference_id && !payload.data.subscription_id) {
    const purchase = await db.query.ppvPurchase.findFirst({
      where: eq(ppvPurchase.id, payload.data.reference_id),
    })
    if (purchase) {
      return handlePpvPayment(purchase, payload)
    }
  }

  const boomfiSubId = payload.data.subscription_id ?? payload.data.reference_id ?? ''
  if (!boomfiSubId) return NextResponse.json({ received: true })

  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.boomfiSubscriptionId, boomfiSubId),
  })

  if (!sub) {
    console.warn('[boomfi webhook] subscription not found:', boomfiSubId)
    return NextResponse.json({ received: true })
  }

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
  const c = await db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) })
  const botToken = process.env['TELEGRAM_BOT_TOKEN']

  if (payload.event === 'Payment.Updated' || payload.event === 'Subscription.Updated') {
    const periodEnd = plan
      ? new Date(Date.now() + plan.intervalDay * 86400_000)
      : new Date(Date.now() + 30 * 86400_000)

    await db
      .update(vipSubscription)
      .set({ status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    // Record the payment for revenue tracking. Crypto payments settle to the
    // platform's own BoomFi account (no automated per-creator split — the
    // Partners API isn't enabled for this merchant, see lib/boomfi.ts), so
    // the creator's share stays 'pending' here until paid out manually via
    // /api/creators/[id]/crypto/withdraw.
    if (payload.event === 'Payment.Updated' && payload.data.amount && payload.data.currency) {
      const grossCents = Math.round(Number(payload.data.amount) * 100)
      if (grossCents > 0) {
        await db
          .insert(payment)
          .values({
            id: randomUUID(),
            creatorId: sub.creatorId,
            vipSubscriptionId: sub.id,
            fanEmail: sub.fanEmail,
            provider: 'boomfi',
            source: `Crypto · ${plan?.title ?? 'VIP'}`,
            boomfiPaymentId: payload.data.id,
            currency: payload.data.currency.toLowerCase(),
            grossCents,
            status: 'paid',
          })
          .onConflictDoNothing({ target: payment.boomfiPaymentId })
      }
    }

    // Generate one-time Telegram invite link and email it to the fan.
    if (botToken && c?.telegramChannelId && sub.fanEmail) {
      try {
        const expireDate = Math.floor(periodEnd.getTime() / 1000)
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              chat_id: c.telegramChannelId,
              member_limit: 1,
              expire_date: expireDate,
            }),
          },
        )
        const tgData = await tgRes.json()
        const inviteLink = tgData?.result?.invite_link

        if (inviteLink) {
          await sendCryptoAccessGranted({
            to: sub.fanEmail,
            creatorName: c.name,
            planTitle: plan?.title ?? 'VIP',
            inviteLink,
            periodEnd,
          }).catch(err => console.error('[boomfi webhook] failed to send access email:', err))
        }
      } catch (err) {
        console.error('[boomfi webhook] failed to create invite link:', err)
      }
    }
  }

  if (payload.event === 'Subscription.Canceled') {
    await db
      .update(vipSubscription)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    if (sub.fanEmail) {
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
      const renewLink = `${appUrl}/p/${c?.slug ?? ''}`
      await sendAccessExpired({
        to: sub.fanEmail,
        creatorName: c?.name ?? '',
        planTitle: plan?.title ?? 'VIP',
        renewLink,
      }).catch(err => console.error('[boomfi webhook] failed to send expiry email:', err))
    }

    // Remove fan from Telegram channel (requires Telegram user_id stored at join time)
    // TODO: store telegram_user_id on vipSubscription when fan joins via invite link
    if (botToken && c?.telegramChannelId) {
      console.log('[boomfi webhook] Canceled — fan should be removed:', sub.fanEmail)
    }
  }

  return NextResponse.json({ received: true })
}

async function handlePpvPayment(
  purchase: typeof ppvPurchase.$inferSelect,
  payload: BoomfiEvent,
): Promise<NextResponse> {
  if (purchase.status === 'paid') return NextResponse.json({ received: true }) // idempotent

  await db
    .update(ppvPurchase)
    .set({ status: 'paid', boomfiPaymentId: payload.data.id })
    .where(eq(ppvPurchase.id, purchase.id))

  const content = await db.query.ppvContent.findFirst({ where: eq(ppvContent.id, purchase.ppvContentId) })
  if (!content) {
    console.error('[boomfi webhook] ppv content not found for purchase:', purchase.id)
    return NextResponse.json({ received: true })
  }

  if (payload.data.amount && payload.data.currency) {
    const grossCents = Math.round(Number(payload.data.amount) * 100)
    if (grossCents > 0) {
      await db
        .insert(payment)
        .values({
          id: randomUUID(),
          creatorId: purchase.creatorId,
          provider: 'boomfi',
          source: `Crypto · PPV${content.title ? ` · ${content.title}` : ''}`,
          boomfiPaymentId: payload.data.id,
          currency: payload.data.currency.toLowerCase(),
          grossCents,
          status: 'paid',
        })
        .onConflictDoNothing({ target: payment.boomfiPaymentId })
    }
  }

  // Deliver the full-resolution media to the fan in a private message —
  // this is the actual "unlock", since Telegram can't unlock a single
  // channel post for one viewer (see packages/db/src/creators.ts ppvContent).
  const botToken = process.env['TELEGRAM_BOT_TOKEN']
  if (botToken) {
    const method = content.mediaType === 'photo' ? 'sendPhoto' : 'sendVideo'
    const field = content.mediaType === 'photo' ? 'photo' : 'video'
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: purchase.telegramUserId,
          [field]: content.fullFileUrl,
          caption: content.title ? `🔓 ${content.title}` : undefined,
        }),
      })
    } catch (err) {
      console.error('[boomfi webhook] failed to deliver PPV media:', err)
    }
  }

  return NextResponse.json({ received: true })
}

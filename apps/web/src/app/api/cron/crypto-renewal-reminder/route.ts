import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { createCryptoPaymentCheckout } from '@repo/payments/stripe/connect'
import { sendCryptoRenewalLink } from '@/lib/email'
import { revokeTelegramAccessForSubscription } from '@/lib/telegram-access'
import { resolvePayoutAccountId } from '@/lib/payout'

const { vipSubscription, vipPlan, vipPlanPrice, creator, subscription } = schema

// GET /api/cron/crypto-renewal-reminder
// Called daily by GCP Cloud Scheduler. Protected by CRON_SECRET (same pattern
// as /api/onlyfans/refresh-sessions).
//
// Stripe crypto payments are one-time (mode: 'payment', no real Subscription
// object — see createCryptoPaymentCheckout), so access doesn't auto-renew.
// This finds stripe_crypto subscriptions expiring in the next REMINDER_DAYS
// and emails the fan a fresh checkout link before access lapses.
//
// Cloud Scheduler config:
//   URL:    https://yourdomain.com/api/cron/crypto-renewal-reminder
//   Method: GET
//   Header: Authorization: Bearer <CRON_SECRET>
//   Schedule: 0 5 * * *  (daily at 5am UTC)

const REMINDER_DAYS = 3

function appUrl(): string {
  return process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
}

async function ownerPlatformPlan(userId: string): Promise<string> {
  const sub = await db.query.subscription.findFirst({
    where: and(eq(subscription.referenceId, userId), eq(subscription.status, 'active')),
  })
  return sub?.plan ?? 'spark'
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env['CRON_SECRET']
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_DAYS * 86400_000)

  // Mark subscriptions past their period end as expired and revoke access,
  // since crypto payments have no Stripe Subscription lifecycle to do this
  // automatically (see createCryptoPaymentCheckout).
  const expired = await db.query.vipSubscription.findMany({
    where: and(
      eq(vipSubscription.provider, 'stripe_crypto'),
      eq(vipSubscription.status, 'active'),
      lte(vipSubscription.currentPeriodEnd, now),
    ),
  })
  for (const sub of expired) {
    await db
      .update(vipSubscription)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))
    await revokeTelegramAccessForSubscription(sub.id).catch((err) =>
      console.error(`crypto expiry revoke failed for subscription ${sub.id}:`, err),
    )
  }

  const expiring = await db.query.vipSubscription.findMany({
    where: and(
      eq(vipSubscription.provider, 'stripe_crypto'),
      eq(vipSubscription.status, 'active'),
      gte(vipSubscription.currentPeriodEnd, now),
      lte(vipSubscription.currentPeriodEnd, windowEnd),
    ),
  })

  const results = { expired: expired.length, total: expiring.length, sent: 0, skipped: 0, errors: 0 }

  for (const sub of expiring) {
    if (!sub.fanEmail || !sub.currentPeriodEnd) {
      results.skipped++
      continue
    }

    try {
      const [plan, c] = await Promise.all([
        db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) }),
        db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) }),
      ])
      if (!plan || !c?.stripeAccountId || !c.stripeOnboarded) {
        results.skipped++
        continue
      }

      const price = await db.query.vipPlanPrice.findFirst({
        where: and(
          eq(vipPlanPrice.planId, plan.id),
          eq(vipPlanPrice.provider, 'stripe_crypto'),
          eq(vipPlanPrice.active, true),
        ),
      })
      if (!price) {
        results.skipped++
        continue
      }

      const payoutAccountId = await resolvePayoutAccountId(c)
      const platformPlan = await ownerPlatformPlan(c.userId)
      const checkoutSession = await createCryptoPaymentCheckout({
        creatorAccountId: payoutAccountId,
        creatorPlatformPlan: platformPlan,
        title: plan.title,
        amount: price.amountCents,
        currency: price.currency,
        customerEmail: sub.fanEmail,
        metadata: { creatorId: c.id, planId: plan.id, provider: 'stripe_crypto' },
        successUrl: `${appUrl()}/p/${c.slug}?vip=success`,
        cancelUrl: `${appUrl()}/p/${c.slug}?vip=cancel`,
      })
      if (!checkoutSession.url) {
        results.errors++
        continue
      }

      await sendCryptoRenewalLink({
        to: sub.fanEmail,
        creatorName: c.name,
        planTitle: plan.title,
        paymentLink: checkoutSession.url,
        expireDate: sub.currentPeriodEnd,
      })
      results.sent++
    } catch (err) {
      console.error(`crypto renewal reminder failed for subscription ${sub.id}:`, err)
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results, ranAt: new Date().toISOString() })
}

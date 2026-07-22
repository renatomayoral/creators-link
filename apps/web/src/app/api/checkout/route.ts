import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { createSubscriptionCheckout } from '@repo/payments/stripe/connect'
import { resolvePayoutAccountId } from '@/lib/payout'

const { creator, vipPlan, vipPlanPrice, subscription } = schema

function appUrl(): string {
  return process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
}

async function ownerPlatformPlan(userId: string): Promise<string> {
  const sub = await db.query.subscription.findFirst({
    where: and(eq(subscription.referenceId, userId), eq(subscription.status, 'active')),
  })
  return sub?.plan ?? 'spark'
}

const bodySchema = z.object({
  planId: z.string().min(1),
  currency: z.string().length(3).toLowerCase().default('usd'),
  email: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { planId, currency, email } = parsed.data

  const plan = await db.query.vipPlan.findFirst({
    where: and(eq(vipPlan.id, planId), eq(vipPlan.active, true)),
  })
  if (!plan) return NextResponse.json({ error: 'Plan not available' }, { status: 404 })

  // Find the Stripe price for the requested currency
  const price = await db.query.vipPlanPrice.findFirst({
    where: and(
      eq(vipPlanPrice.planId, planId),
      eq(vipPlanPrice.currency, currency),
      eq(vipPlanPrice.provider, 'stripe'),
      eq(vipPlanPrice.active, true),
    ),
  })
  if (!price?.stripePriceId) {
    return NextResponse.json({ error: 'Price not available for this currency' }, { status: 404 })
  }

  const c = await db.query.creator.findFirst({ where: eq(creator.id, plan.creatorId) })
  if (!c || !c.stripeAccountId || !c.stripeOnboarded) {
    return NextResponse.json({ error: 'Creator cannot accept payments' }, { status: 409 })
  }

  const payoutAccountId = await resolvePayoutAccountId(c)
  const platformPlan = await ownerPlatformPlan(c.userId)

  try {
    const checkoutSession = await createSubscriptionCheckout({
      creatorAccountId: payoutAccountId,
      creatorPlatformPlan: platformPlan,
      priceId: price.stripePriceId,
      customerEmail: email,
      metadata: { creatorId: c.id, planId: plan.id, provider: 'stripe' },
      successUrl: `${appUrl()}/p/${c.slug}?vip=success`,
      cancelUrl: `${appUrl()}/p/${c.slug}?vip=cancel`,
    })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('checkout session creation failed', err)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}

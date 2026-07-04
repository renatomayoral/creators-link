import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { createVipPrice } from '@repo/payments/stripe/connect'
import { createSubscriptionPlan } from '@/lib/nowpayments'

const { creator, vipPlan, vipPlanPrice } = schema

async function ownedCreator(id: string, userId: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c || c.userId !== userId) return null
  return c
}

// ─── GET /api/creators/[id]/plans ────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const plans = await db.query.vipPlan.findMany({
    where: eq(vipPlan.creatorId, id),
    orderBy: (p, { asc }) => [asc(p.intervalDay)],
  })

  // Fetch prices for all plans
  const planIds = plans.map((p) => p.id)
  const prices =
    planIds.length > 0
      ? await db.query.vipPlanPrice.findMany({
          where: (vpp, { inArray }) => inArray(vpp.planId, planIds),
        })
      : []

  const pricesByPlan = prices.reduce<Record<string, typeof prices>>((acc, p) => {
    ;(acc[p.planId] ??= []).push(p)
    return acc
  }, {})

  return NextResponse.json(plans.map((p) => ({ ...p, prices: pricesByPlan[p.id] ?? [] })))
}

// ─── POST /api/creators/[id]/plans ───────────────────────────────────────────

const priceSchema = z.object({
  currency: z.string().length(3).toLowerCase(),
  amountCents: z.number().int().min(100),
  provider: z.enum(['stripe', 'stripe_crypto', 'pix_auto', 'pix_manual', 'crypto', 'crypto_sub']),
  nowpaymentsPlansId: z.string().optional(),
})

const createSchema = z.object({
  title: z.string().min(2).max(60),
  description: z.string().max(280).nullable().optional(),
  intervalDay: z.number().int().min(1).max(366).default(30),
  prices: z.array(priceSchema).min(1),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, description, intervalDay, prices } = parsed.data

  // Create Stripe prices where provider = stripe (requires connected account)
  const stripePrices = prices.filter((p) => p.provider === 'stripe')
  if (stripePrices.length > 0 && (!c.stripeAccountId || !c.stripeOnboarded)) {
    return NextResponse.json(
      { error: 'Conecte uma conta Stripe antes de criar preços via Stripe' },
      { status: 409 },
    )
  }

  const planId = randomUUID()

  try {
    await db.insert(vipPlan).values({
      id: planId,
      creatorId: id,
      title,
      description: description ?? null,
      intervalDay,
    })

    // Create each price, creating Stripe/NowPayments objects where needed
    for (const price of prices) {
      let stripePriceId: string | null = null
      let nowpaymentsPlansId: string | null = price.nowpaymentsPlansId ?? null

      if (price.provider === 'stripe' && c.stripeAccountId) {
        stripePriceId = await createVipPrice({
          creatorAccountId: c.stripeAccountId,
          title,
          description: description ?? undefined,
          amount: price.amountCents,
          currency: price.currency,
          intervalDay,
        })
      }

      // Auto-create NowPayments Subscription Plan for crypto_sub provider
      if (price.provider === 'crypto_sub' && !nowpaymentsPlansId && process.env['NOWPAYMENTS_API_KEY']) {
        try {
          const plan = await createSubscriptionPlan({
            title: `${title} — ${c.name}`,
            currency: price.currency,
            amount: price.amountCents / 100,
            intervalDay,
          })
          nowpaymentsPlansId = plan.id
        } catch (err) {
          console.error('[plans] failed to create NowPayments subscription plan:', err)
        }
      }

      await db.insert(vipPlanPrice).values({
        id: randomUUID(),
        planId,
        currency: price.currency,
        amountCents: price.amountCents,
        provider: price.provider,
        stripePriceId,
        nowpaymentsPlansId,
      })
    }
  } catch (err) {
    console.error('[POST /api/creators/[id]/plans]', err)
    // rollback plan if prices failed
    await db.delete(vipPlan).where(eq(vipPlan.id, planId)).catch(() => null)
    return NextResponse.json({ error: 'Erro ao criar o plano' }, { status: 502 })
  }

  return NextResponse.json({ id: planId }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { archiveVipPrice } from '@repo/payments/stripe/connect'

const { creator, vipPlan, vipPlanPrice } = schema

async function ownedPlan(creatorId: string, planId: string, userId: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== userId) return null
  const plan = await db.query.vipPlan.findFirst({
    where: and(eq(vipPlan.id, planId), eq(vipPlan.creatorId, creatorId)),
  })
  if (!plan) return null
  return { creator: c, plan }
}

// ─── PATCH /api/creators/[id]/plans/[planId] ─────────────────────────────────

const patchSchema = z.object({
  title: z.string().min(2).max(60).optional(),
  description: z.string().max(280).nullable().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, planId } = await params
  const owned = await ownedPlan(id, planId, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // When deactivating, archive all Stripe prices on this plan
  if (parsed.data.active === false && owned.plan.active && owned.creator.stripeAccountId) {
    const stripePrices = await db.query.vipPlanPrice.findMany({
      where: and(eq(vipPlanPrice.planId, planId), eq(vipPlanPrice.provider, 'stripe')),
    })
    for (const price of stripePrices) {
      if (price.stripePriceId) {
        try {
          await archiveVipPrice(owned.creator.stripeAccountId, price.stripePriceId)
          await db.update(vipPlanPrice).set({ active: false }).where(eq(vipPlanPrice.id, price.id))
        } catch (err) {
          console.error('stripe price archive failed', err)
        }
      }
    }
  }

  await db
    .update(vipPlan)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(vipPlan.id, planId))

  return NextResponse.json({ ok: true })
}

// ─── DELETE /api/creators/[id]/plans/[planId] ─────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, planId } = await params
  const owned = await ownedPlan(id, planId, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Archive all Stripe prices before deleting
  if (owned.creator.stripeAccountId) {
    const stripePrices = await db.query.vipPlanPrice.findMany({
      where: and(eq(vipPlanPrice.planId, planId), eq(vipPlanPrice.provider, 'stripe')),
    })
    for (const price of stripePrices) {
      if (price.stripePriceId) {
        await archiveVipPrice(owned.creator.stripeAccountId, price.stripePriceId).catch(() => null)
      }
    }
  }

  try {
    await db.delete(vipPlan).where(eq(vipPlan.id, planId))
  } catch {
    // Has subscriptions (restrict FK) — soft delete
    await db.update(vipPlan).set({ active: false, updatedAt: new Date() }).where(eq(vipPlan.id, planId))
    return NextResponse.json({ ok: true, softDeleted: true })
  }

  return NextResponse.json({ ok: true })
}

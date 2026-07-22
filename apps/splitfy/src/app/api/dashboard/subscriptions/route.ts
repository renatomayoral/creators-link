import { NextRequest, NextResponse } from 'next/server'
import { eq, desc, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'

const { subscription, charge } = schema

// GET /api/dashboard/subscriptions — subscriptions + last charge, for the session user's merchant.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getOwnedMerchant(session.user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const subs = await db.query.subscription.findMany({
    where: eq(subscription.merchantId, merchant.id),
    orderBy: [desc(subscription.createdAt)],
  })

  const subIds = subs.map((s) => s.id)
  const charges = subIds.length
    ? await db.query.charge.findMany({ where: inArray(charge.subscriptionId, subIds), orderBy: [desc(charge.createdAt)] })
    : []

  const lastChargeBySub = new Map<string, (typeof charges)[number]>()
  for (const c of charges) {
    if (!lastChargeBySub.has(c.subscriptionId)) lastChargeBySub.set(c.subscriptionId, c)
  }

  return NextResponse.json({
    subscriptions: subs.map((s) => ({ ...s, lastCharge: lastChargeBySub.get(s.id) ?? null })),
  })
}

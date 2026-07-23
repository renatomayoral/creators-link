import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { createPlanSchema } from '@/lib/validation'
import { getToken } from '@/lib/crypto-coins'
import { newId } from '@/lib/ids'

const { plan } = schema

// GET /api/dashboard/plans — plans for the session user's merchant.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getOwnedMerchant(session.user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const plans = await db.query.plan.findMany({ where: eq(plan.merchantId, merchant.id) })
  return NextResponse.json({ plans })
}

// POST /api/dashboard/plans — create a plan for the session user's merchant.
// Reuses the same Zod schema as the public /api/v1/plans endpoint, so the
// dashboard and the API-key-authenticated integration stay in lockstep.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getOwnedMerchant(session.user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const token = getToken(parsed.data.tokenKey)
  if (!token) return NextResponse.json({ error: 'Unknown tokenKey' }, { status: 400 })

  const [created] = await db
    .insert(plan)
    .values({
      id: newId('plan'),
      merchantId: merchant.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      tokenKey: parsed.data.tokenKey,
      chainId: token.chainId,
      intervalDay: parsed.data.intervalDay,
      merchantDestinationWallet: parsed.data.merchantDestinationWallet,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}

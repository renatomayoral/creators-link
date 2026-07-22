import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { authenticateMerchant } from '@/lib/api-key'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createPlanSchema } from '@/lib/validation'
import { getToken } from '@/lib/crypto-coins'
import { newId } from '@/lib/ids'

const { plan } = schema

const PLANS_RATE_LIMIT = 60 // requests per minute per merchant

// POST /api/v1/plans — create a recurring plan for the authenticated merchant.
export async function POST(req: NextRequest) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(`apikey:${merchant.id}:plans`, PLANS_RATE_LIMIT)
  const limited = rateLimitResponse(rl)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

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

// GET /api/v1/plans — list plans for the authenticated merchant.
export async function GET(req: NextRequest) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(`apikey:${merchant.id}:plans`, PLANS_RATE_LIMIT)
  const limited = rateLimitResponse(rl)
  if (limited) return limited

  const plans = await db.query.plan.findMany({ where: eq(plan.merchantId, merchant.id) })
  return NextResponse.json({ plans })
}

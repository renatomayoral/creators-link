import { NextRequest, NextResponse } from 'next/server'
import { parseUnits } from 'viem'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { authenticateMerchant } from '@/lib/api-key'
import { createSubscriptionSchema } from '@/lib/validation'
import { getToken } from '@/lib/crypto-coins'
import { getOperatorAddress } from '@/lib/operator'
import { newId } from '@/lib/ids'
import { env } from '@/env'
import { sendWebhook } from '@/lib/webhooks'

const { plan, subscription } = schema

// How many billing cycles of allowance to request up front, so subscribers
// aren't asked to re-approve every cycle, while still avoiding an unbounded
// (MaxUint256) grant to the operator wallet.
const ALLOWANCE_CYCLES = 12

// POST /api/v1/subscriptions — create a pending subscription for a plan.
export async function POST(req: NextRequest) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSubscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const foundPlan = await db.query.plan.findFirst({
    where: eq(plan.id, parsed.data.planId),
  })
  if (!foundPlan || foundPlan.merchantId !== merchant.id) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const token = getToken(foundPlan.tokenKey)
  if (!token) return NextResponse.json({ error: 'Plan references an unknown token' }, { status: 500 })

  const [created] = await db
    .insert(subscription)
    .values({
      id: newId('sub'),
      merchantId: merchant.id,
      planId: foundPlan.id,
      subscriberWallet: parsed.data.subscriberWallet,
      chainId: foundPlan.chainId,
      merchantReferenceId: parsed.data.merchantReferenceId,
    })
    .returning()

  if (!created) return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })

  await sendWebhook(merchant.id, 'subscription.created', { subscriptionId: created.id, planId: foundPlan.id, status: created.status })

  const requiredAllowance = parseUnits(foundPlan.amount, token.decimals) * BigInt(ALLOWANCE_CYCLES)

  return NextResponse.json(
    {
      id: created.id,
      status: created.status,
      subscribeUrl: `${env.appUrl}/subscribe/${created.id}`,
      requiredAllowance: requiredAllowance.toString(),
      operatorWallet: getOperatorAddress(),
      tokenAddress: token.address,
      chainId: foundPlan.chainId,
    },
    { status: 201 },
  )
}

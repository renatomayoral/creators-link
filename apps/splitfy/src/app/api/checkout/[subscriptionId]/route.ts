import { NextRequest, NextResponse } from 'next/server'
import { parseUnits } from 'viem'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getToken } from '@/lib/crypto-coins'
import { getOperatorAddress } from '@/lib/operator'

const { subscription, plan } = schema

// How many billing cycles of allowance the checkout page prompts for.
const ALLOWANCE_CYCLES = 12

// GET /api/checkout/[subscriptionId] — public, subscriber-facing (no API key):
// the minimal info the connect-wallet + approve page needs to render. Does
// not expose merchant-internal fields.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const { subscriptionId } = await params
  const sub = await db.query.subscription.findFirst({ where: eq(subscription.id, subscriptionId) })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const foundPlan = await db.query.plan.findFirst({ where: eq(plan.id, sub.planId) })
  if (!foundPlan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = getToken(foundPlan.tokenKey)
  if (!token) return NextResponse.json({ error: 'Unknown token' }, { status: 500 })

  const requiredAllowance = parseUnits(foundPlan.amount, token.decimals) * BigInt(ALLOWANCE_CYCLES)

  return NextResponse.json({
    id: sub.id,
    status: sub.status,
    planName: foundPlan.name,
    amount: foundPlan.amount,
    ticker: token.ticker,
    chainId: foundPlan.chainId,
    tokenAddress: token.address,
    decimals: token.decimals,
    operatorWallet: getOperatorAddress(),
    requiredAllowance: requiredAllowance.toString(),
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { getStripe } from '@repo/payments'

const { userProfile, creator } = schema

export type StripeBalanceResponse = {
  connected: boolean
  onboarded: boolean
  /** In whole currency units (not cents). Null when not connected/onboarded. */
  available: number | null
  pending: number | null
  currency: string | null
  bankLast4: string | null
  bankName: string | null
}

const EMPTY: StripeBalanceResponse = {
  connected: false,
  onboarded: false,
  available: null,
  pending: null,
  currency: null,
  bankLast4: null,
  bankName: null,
}

// ─── GET /api/dashboard/stripe-balance — real Stripe Connect balance ──────────
// Supports both onboarding modes: 'agency' reads the single userProfile
// account; 'per_creator' sums the balance across every onboarded creator
// account owned by this user.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (profile?.stripeMode === 'agency') {
    if (!profile.stripeAccountId) return NextResponse.json(EMPTY)
    if (!profile.stripeOnboarded) {
      return NextResponse.json({ ...EMPTY, connected: true })
    }
    const result = await readAccountBalance(profile.stripeAccountId)
    return NextResponse.json(result)
  }

  if (profile?.stripeMode === 'per_creator') {
    const creators = await db.query.creator.findMany({
      where: and(eq(creator.userId, session.user.id), eq(creator.stripeOnboarded, true)),
      columns: { stripeAccountId: true },
    })
    const accountIds = creators.map((c) => c.stripeAccountId).filter((id): id is string => !!id)
    if (!accountIds.length) return NextResponse.json(EMPTY)

    const balances = await Promise.all(accountIds.map((id) => readAccountBalance(id)))
    const currency = balances[0]?.currency ?? null
    const available = balances.reduce((sum, b) => sum + (b.available ?? 0), 0)
    const pending = balances.reduce((sum, b) => sum + (b.pending ?? 0), 0)
    return NextResponse.json({
      connected: true,
      onboarded: true,
      available,
      pending,
      currency,
      bankLast4: null, // no single bank account when funds span multiple creator accounts
      bankName: null,
    } satisfies StripeBalanceResponse)
  }

  return NextResponse.json(EMPTY)
}

async function readAccountBalance(stripeAccountId: string): Promise<StripeBalanceResponse> {
  const stripe = getStripe()
  const [balance, account] = await Promise.all([
    stripe.balance.retrieve(undefined, { stripeAccount: stripeAccountId }),
    stripe.accounts.retrieve(stripeAccountId),
  ])

  const availableEntry = balance.available[0]
  const pendingEntry = balance.pending[0]
  const bankAccount = account.external_accounts?.data.find((a) => a.object === 'bank_account') as
    | { last4?: string; bank_name?: string }
    | undefined

  return {
    connected: true,
    onboarded: true,
    available: availableEntry ? availableEntry.amount / 100 : 0,
    pending: pendingEntry ? pendingEntry.amount / 100 : 0,
    currency: availableEntry?.currency ?? pendingEntry?.currency ?? null,
    bankLast4: bankAccount?.last4 ?? null,
    bankName: bankAccount?.bank_name ?? null,
  }
}

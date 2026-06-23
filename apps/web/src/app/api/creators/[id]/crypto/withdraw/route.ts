import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@/lib/auth'
import { getCustomerBalance, withdrawFromCustomer } from '@/lib/nowpayments'

const { creator } = schema

const bodySchema = z.object({
  currency: z.string().min(2),
  amount: z.number().positive().optional(), // if omitted, withdraws full balance
})

// POST /api/creators/[id]/crypto/withdraw
// Manual withdrawal from Custody balance to creator's external wallet.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!c.nowpaymentsCustomerId)
    return NextResponse.json({ error: 'Crypto não configurado' }, { status: 400 })
  if (!c.cryptoWithdrawAddress)
    return NextResponse.json({ error: 'Endereço de saque não configurado' }, { status: 400 })

  const { currency, amount } = parsed.data
  const withdrawCurrency = currency || c.cryptoWithdrawCurrency

  if (!withdrawCurrency)
    return NextResponse.json({ error: 'Moeda de saque não configurada' }, { status: 400 })

  // If no amount specified, withdraw full balance for that currency
  let withdrawAmount = amount
  if (!withdrawAmount) {
    const balances = await getCustomerBalance(c.nowpaymentsCustomerId)
    const bal = balances.find(b => b.currency === withdrawCurrency)
    if (!bal || bal.balance <= 0)
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    withdrawAmount = bal.balance
  }

  try {
    const result = await withdrawFromCustomer({
      customerId: c.nowpaymentsCustomerId,
      address: c.cryptoWithdrawAddress,
      currency: withdrawCurrency,
      amount: withdrawAmount,
    })

    return NextResponse.json({
      withdrawalId: result.withdrawalId,
      amount: withdrawAmount,
      currency: withdrawCurrency,
      address: c.cryptoWithdrawAddress,
    })
  } catch (err) {
    console.error('[crypto/withdraw]', err)
    const message = err instanceof Error ? err.message : 'Erro ao sacar'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// GET /api/creators/[id]/crypto/withdraw — returns current balance
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!c.nowpaymentsCustomerId)
    return NextResponse.json({ balances: [] })

  try {
    const balances = await getCustomerBalance(c.nowpaymentsCustomerId)
    return NextResponse.json({ balances })
  } catch (err) {
    console.error('[crypto/withdraw GET]', err)
    return NextResponse.json({ balances: [] })
  }
}

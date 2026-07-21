import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { getAccountBalances, createCryptoPayout } from '@/lib/boomfi'

const { creator } = schema

const bodySchema = z.object({
  currency: z.string().min(2),
  chainId: z.number().int().positive(),
  amount: z.string().optional(), // if omitted, withdraws full balance
})

// POST /api/creators/[id]/crypto/withdraw
// Manual payout from the creator's BoomFi Virtual Account balance to their
// external wallet. Deposit splits already route most funds automatically —
// this covers any balance left in the managed account (e.g. dust, or splits
// not yet configured for a given chain).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!c.boomfiAccountRef)
    return NextResponse.json({ error: 'Crypto não configurado' }, { status: 400 })
  if (!c.cryptoWithdrawAddress)
    return NextResponse.json({ error: 'Endereço de saque não configurado' }, { status: 400 })

  const { currency, chainId } = parsed.data

  let withdrawAmount = parsed.data.amount
  if (!withdrawAmount) {
    const balances = await getAccountBalances(c.boomfiAccountRef)
    const bal = balances.find(b => b.currency === currency)
    if (!bal || bal.balance <= 0)
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    withdrawAmount = String(bal.balance)
  }

  try {
    await createCryptoPayout({
      accountRef: c.boomfiAccountRef,
      amount: withdrawAmount,
      currency,
      chainId,
      walletAddress: c.cryptoWithdrawAddress,
    })

    return NextResponse.json({
      amount: withdrawAmount,
      currency,
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

  if (!c.boomfiAccountRef)
    return NextResponse.json({ balances: [] })

  try {
    const balances = await getAccountBalances(c.boomfiAccountRef)
    return NextResponse.json({ balances })
  } catch (err) {
    console.error('[crypto/withdraw GET]', err)
    return NextResponse.json({ balances: [] })
  }
}

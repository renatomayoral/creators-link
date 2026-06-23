import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@/lib/auth'
import { createCustomer } from '@/lib/nowpayments'

const { creator } = schema

const bodySchema = z.object({
  cryptoWithdrawAddress: z.string().min(10),
  cryptoWithdrawCurrency: z.string().min(2),
  cryptoAutoWithdraw: z.boolean(),
})

// POST /api/creators/[id]/crypto/setup
// Creates a NowPayments Custody customer for the creator and saves withdrawal config.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { cryptoWithdrawAddress, cryptoWithdrawCurrency, cryptoAutoWithdraw } = parsed.data

  let nowpaymentsCustomerId = c.nowpaymentsCustomerId

  // Create customer only if not already created
  if (!nowpaymentsCustomerId) {
    try {
      const customer = await createCustomer({ externalId: id, email: session.user.email ?? undefined })
      nowpaymentsCustomerId = customer.id
    } catch (err) {
      console.error('[crypto/setup] failed to create NowPayments customer:', err)
      return NextResponse.json(
        { error: 'Falha ao criar conta de custódia no NowPayments' },
        { status: 502 },
      )
    }
  }

  await db
    .update(creator)
    .set({
      nowpaymentsCustomerId,
      cryptoWithdrawAddress,
      cryptoWithdrawCurrency,
      cryptoAutoWithdraw,
      updatedAt: new Date(),
    })
    .where(eq(creator.id, id))

  return NextResponse.json({
    nowpaymentsCustomerId,
    cryptoWithdrawAddress,
    cryptoWithdrawCurrency,
    cryptoAutoWithdraw,
  })
}

// GET /api/creators/[id]/crypto/setup — returns current crypto config
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({
    nowpaymentsCustomerId: c.nowpaymentsCustomerId,
    cryptoWithdrawAddress: c.cryptoWithdrawAddress,
    cryptoWithdrawCurrency: c.cryptoWithdrawCurrency,
    cryptoAutoWithdraw: c.cryptoAutoWithdraw,
  })
}

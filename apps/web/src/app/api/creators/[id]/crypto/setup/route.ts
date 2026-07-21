import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { createVirtualAccount } from '@/lib/boomfi'

const { creator } = schema

const bodySchema = z.object({
  cryptoWithdrawAddress: z.string().min(10),
  cryptoWithdrawCurrency: z.string().min(2),
  chainId: z.number().int().positive(),
})

const PLATFORM_ACCOUNT_REF = process.env['BOOMFI_PLATFORM_ACCOUNT_REF'] ?? ''

// POST /api/creators/[id]/crypto/setup
// Creates a BoomFi Partners Virtual Account for the creator with a deposit
// split: the platform fee routes to our main account automatically at
// pay-in time, the rest settles directly to the creator's wallet.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { cryptoWithdrawAddress, cryptoWithdrawCurrency, chainId } = parsed.data

  let boomfiAccountRef = c.boomfiAccountRef

  if (!boomfiAccountRef) {
    if (!PLATFORM_ACCOUNT_REF) {
      return NextResponse.json(
        { error: 'BOOMFI_PLATFORM_ACCOUNT_REF não configurado' },
        { status: 500 },
      )
    }
    try {
      const feePct = Number(c.platformFeePct ?? '10')
      const account = await createVirtualAccount({
        reference: id,
        name: c.name,
        chain: { id: chainId, walletAddress: cryptoWithdrawAddress },
        platformSplit: { percentage: feePct, destinationRef: PLATFORM_ACCOUNT_REF },
      })
      boomfiAccountRef = account.reference
    } catch (err) {
      console.error('[crypto/setup] failed to create BoomFi virtual account:', err)
      return NextResponse.json(
        { error: 'Falha ao criar conta de settlement no BoomFi' },
        { status: 502 },
      )
    }
  }

  await db
    .update(creator)
    .set({
      boomfiAccountRef,
      cryptoWithdrawAddress,
      cryptoWithdrawCurrency,
      updatedAt: new Date(),
    })
    .where(eq(creator.id, id))

  return NextResponse.json({
    boomfiAccountRef,
    cryptoWithdrawAddress,
    cryptoWithdrawCurrency,
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
    boomfiAccountRef: c.boomfiAccountRef,
    cryptoWithdrawAddress: c.cryptoWithdrawAddress,
    cryptoWithdrawCurrency: c.cryptoWithdrawCurrency,
  })
}

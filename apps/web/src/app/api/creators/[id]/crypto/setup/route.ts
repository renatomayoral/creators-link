import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { CRYPTO_COINS } from '@/lib/crypto-coins'

const { creator, creatorCryptoCoin } = schema

const validCoinKeys = new Set(CRYPTO_COINS.map(c => c.key))

const bodySchema = z.object({
  coinKeys: z.array(z.string()).refine(
    keys => keys.every(k => validCoinKeys.has(k)),
    { message: 'Moeda desconhecida' },
  ),
})

// POST /api/creators/[id]/crypto/setup
// Sets which coins the creator accepts for crypto payments. Payments settle
// to the platform's own BoomFi settlement accounts (not a creator wallet) —
// see the note in packages/db/src/creators.ts (creatorCryptoCoin) for why.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { coinKeys } = parsed.data

  await db.delete(creatorCryptoCoin).where(eq(creatorCryptoCoin.creatorId, id))
  if (coinKeys.length > 0) {
    await db.insert(creatorCryptoCoin).values(
      coinKeys.map(coinKey => ({ id: randomUUID(), creatorId: id, coinKey })),
    )
  }

  return NextResponse.json({ coinKeys })
}

// GET /api/creators/[id]/crypto/setup — returns accepted coins
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const coins = await db.query.creatorCryptoCoin.findMany({
    where: eq(creatorCryptoCoin.creatorId, id),
  })

  return NextResponse.json({ coinKeys: coins.map(c => c.coinKey) })
}

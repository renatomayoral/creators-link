import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator, payment } = schema

// GET /api/creators/[id]/crypto/withdraw
// Returns the creator's share still owed from crypto ('boomfi') payments,
// grouped by currency. Crypto payments settle to the platform's own BoomFi
// account (no automated per-creator payout yet — see creatorCryptoCoin) so
// this is informational: the platform pays the creator's share out
// off-platform, then marks it paid via POST below.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pending = await db.query.payment.findMany({
    where: and(
      eq(payment.creatorId, id),
      eq(payment.provider, 'boomfi'),
      eq(payment.status, 'paid'),
      eq(payment.creatorPayoutStatus, 'pending'),
    ),
  })

  const feePct = Number(c.platformFeePct ?? '10') / 100
  const owedByCurrency = new Map<string, number>()
  for (const p of pending) {
    const creatorShareCents = Math.round(p.grossCents * (1 - feePct))
    owedByCurrency.set(p.currency, (owedByCurrency.get(p.currency) ?? 0) + creatorShareCents)
  }

  return NextResponse.json({
    owed: Array.from(owedByCurrency.entries()).map(([currency, cents]) => ({ currency, cents })),
    paymentIds: pending.map(p => p.id),
  })
}

const markPaidSchema = z.object({
  paymentIds: z.array(z.string()).min(1),
})

// POST /api/creators/[id]/crypto/withdraw
// Marks the given crypto payments as paid out to the creator (manual
// off-platform transfer already done — Pix, bank transfer, sent crypto by hand).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = markPaidSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db
    .update(payment)
    .set({ creatorPayoutStatus: 'paid_out' })
    .where(and(eq(payment.creatorId, id), inArray(payment.id, parsed.data.paymentIds)))

  return NextResponse.json({ ok: true })
}

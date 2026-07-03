import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator, payment } = schema

// ─── GET /api/dashboard/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD ──────────
// Real payment history for the signed-in user's creators, in the shape the
// dashboard's LedgerRow expects: pf/fx are fractions of gross (0.039 = 3.9%),
// gross is in whole currency units (not cents).

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params are required' }, { status: 400 })
  }

  const creators = await db.query.creator.findMany({
    where: eq(creator.userId, session.user.id),
    columns: { id: true, name: true },
  })
  if (!creators.length) return NextResponse.json([])

  const creatorIds = creators.map((c) => c.id)
  const nameById = new Map(creators.map((c) => [c.id, c.name]))

  // end is a date without time — include the whole day.
  const endOfDay = new Date(`${end}T23:59:59.999Z`)

  const rows = await db
    .select()
    .from(payment)
    .where(
      and(
        inArray(payment.creatorId, creatorIds),
        eq(payment.status, 'paid'),
        gte(payment.createdAt, new Date(`${start}T00:00:00.000Z`)),
        lte(payment.createdAt, endOfDay),
      ),
    )
    .orderBy(asc(payment.createdAt))

  const ledger = rows.map((r) => {
    const gross = r.grossCents / 100
    // pf/fx are stored as absolute cents but the dashboard's compute() expects
    // them as fractions of gross — convert here so the UI stays unchanged.
    const pf = gross > 0 ? r.providerFeeCents / 100 / gross : 0
    const fx = gross > 0 ? r.fxFeeCents / 100 / gross : 0
    return {
      id: r.id,
      date: r.createdAt.toISOString().slice(0, 10),
      creator: nameById.get(r.creatorId) ?? 'Unknown',
      source: r.source,
      sc: sourceColor(r.source),
      gross,
      pf,
      fx,
      tg: r.source.startsWith('Telegram'),
    }
  })

  return NextResponse.json(ledger)
}

// Matches the palette used across creator-links/platform components.
function sourceColor(source: string): string {
  const s = source.toLowerCase()
  if (s.startsWith('telegram')) return '#38bdf8'
  if (s.includes('onlyfans')) return '#ec4899'
  if (s.includes('fanvue')) return '#6d5dfc'
  if (s.includes('privacy')) return '#ff5a5f'
  if (s.includes('fansly')) return '#1da1f2'
  if (s.includes('patreon')) return '#ff424d'
  return '#64748b'
}

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator } = schema

// GET /api/creators/[id]/payout-hubs
// Lists this user's other creators that are eligible to be a centralized
// Stripe payout hub (Stripe-onboarded, excluding the creator itself).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const candidates = await db.query.creator.findMany({
    where: and(
      eq(creator.userId, session.user.id),
      eq(creator.stripeOnboarded, true),
      ne(creator.id, id),
    ),
    columns: { id: true, name: true },
  })

  return NextResponse.json(candidates)
}

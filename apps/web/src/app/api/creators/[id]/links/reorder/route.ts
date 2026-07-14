import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator, creatorLink } = schema

async function ownedCreator(id: string, userId: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c || c.userId !== userId) return null
  return c
}

const bodySchema = z.object({
  order: z.array(z.string().min(1)).min(1),
})

// PATCH /api/creators/[id]/links/reorder — bulk-update sortOrder from a dragged link ID list
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { order } = parsed.data

  // Ensure every link belongs to this creator before touching sort order.
  const existing = await db.query.creatorLink.findMany({
    where: eq(creatorLink.creatorId, id),
    columns: { id: true },
  })
  const ownedIds = new Set(existing.map((l) => l.id))
  if (!order.every((linkId) => ownedIds.has(linkId))) {
    return NextResponse.json({ error: 'Invalid link id in order' }, { status: 400 })
  }

  await Promise.all(
    order.map((linkId, index) =>
      db
        .update(creatorLink)
        .set({ sortOrder: index })
        .where(and(eq(creatorLink.id, linkId), eq(creatorLink.creatorId, id))),
    ),
  )

  return NextResponse.json({ ok: true })
}

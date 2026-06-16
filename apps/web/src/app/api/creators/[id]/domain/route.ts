import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator } = schema

async function ownedCreator(id: string, userId: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c || c.userId !== userId) return null
  return c
}

const domainSchema = z.object({
  customDomain: z
    .string()
    .max(253)
    .regex(/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/, 'Domínio inválido')
    .nullable(),
})

// ─── PUT /api/creators/[id]/domain — set or clear custom domain ──────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = domainSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { customDomain } = parsed.data
  const normalised = customDomain ? customDomain.toLowerCase().replace(/^www\./, '') : null

  // Check uniqueness (another creator may already own this domain)
  if (normalised) {
    const conflict = await db.query.creator.findFirst({
      where: eq(creator.customDomain, normalised),
    })
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: 'Domínio já está em uso' }, { status: 409 })
    }
  }

  await db
    .update(creator)
    .set({ customDomain: normalised, updatedAt: new Date() })
    .where(eq(creator.id, id))

  return NextResponse.json({ ok: true, customDomain: normalised })
}

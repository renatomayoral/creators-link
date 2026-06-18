import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { OnlyFansClient, OfAuthError, parseCookieString } from '@repo/onlyfans-client'

const { platformToken, creator, verification } = schema

// GET /api/onlyfans/session?creatorId=xxx — connection status
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'onlyfans')),
  })

  if (!token) return NextResponse.json({ connected: false })

  // expiresAt = epoch(0) is the sentinel written by refresh-sessions when OF rejects the session
  const expired = token.expiresAt !== null && token.expiresAt.getTime() === 0

  return NextResponse.json({
    connected: true,
    expired,
    handle: token.platformHandle,
    platformUserId: token.platformUserId,
  })
}

// Body shape 1 — bookmarklet (no auth session, token identifies creator)
const BookmarkletBody = z.object({
  token: z.string().uuid(),
  cookieStr: z.string().min(10),
  userId: z.string(),
})

// Body shape 2 — manual paste (requires auth session)
const ManualBody = z.object({
  creatorId: z.string(),
  cookies: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const raw = await req.json()

  // ── Bookmarklet flow ──────────────────────────────────────────────────────
  // Request originates from OF's domain via the bookmarklet script.
  // No auth cookie is sent — creator is identified by the one-time token.
  if ('token' in raw) {
    const body = BookmarkletBody.safeParse(raw)
    if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { token, cookieStr, userId } = body.data

    // Look up the token
    const rows = await db
      .select()
      .from(verification)
      .where(eq(verification.value, token))

    const verif = rows[0]
    if (!verif) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }
    if (verif.expiresAt < new Date()) {
      await db.delete(verification).where(eq(verification.id, verif.id))
      return NextResponse.json({ error: 'Token expirado. Gere um novo favorito no app.' }, { status: 401 })
    }

    // Consume token (one-use)
    await db.delete(verification).where(eq(verification.id, verif.id))

    const creatorId = verif.identifier.replace('of-bookmarklet:', '')
    return saveSession(creatorId, cookieStr, userId)
  }

  // ── Manual flow ───────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = ManualBody.safeParse(raw)
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { creatorId, cookies } = body.data

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let parsed: { cookieStr: string; userId: string }
  try {
    parsed = parseCookieString(cookies.trim())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }

  return saveSession(creatorId, parsed.cookieStr, parsed.userId)
}

// DELETE /api/onlyfans/session?creatorId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .delete(platformToken)
    .where(and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'onlyfans')))

  return NextResponse.json({ ok: true })
}

// ─── Shared: validate cookies against OF API then upsert platform_token ───────

async function saveSession(
  creatorId: string,
  cookieStr: string,
  userId: string,
): Promise<NextResponse> {
  const client = new OnlyFansClient({ cookieStr, userId })

  let profile: Awaited<ReturnType<typeof client.getProfile>>
  try {
    profile = await client.getProfile()
  } catch (e) {
    if (e instanceof OfAuthError) {
      return NextResponse.json(
        { error: 'Sessão inválida. Certifique-se de estar logada no OnlyFans e tente novamente.' },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Erro ao validar sessão no OnlyFans' }, { status: 502 })
  }

  const existing = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'onlyfans')),
  })

  const row = {
    accessToken: userId || String(profile.id),
    apiToken: cookieStr,
    platformUserId: String(profile.id),
    platformHandle: profile.username,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(platformToken).set(row).where(eq(platformToken.id, existing.id))
  } else {
    await db.insert(platformToken).values({
      id: randomUUID(),
      creatorId,
      platform: 'onlyfans',
      scopes: ['read:profile', 'read:earnings', 'read:subscribers'],
      ...row,
    })
  }

  return NextResponse.json({
    ok: true,
    handle: profile.username,
    name: profile.name,
    subscribersCount: profile.subscribersCount,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { parseCookieEditorJson, parseCookieString, OnlyFansClient, OfAuthError } from '@repo/onlyfans-client'

const { platformToken, creator } = schema

const Body = z.object({
  creatorId: z.string(),
  /** Raw cookie string OR Cookie-Editor JSON array */
  cookies: z.string().min(10),
})

// POST /api/onlyfans/session
// Validates + saves OF session cookies for a creator.
// Accepts either Cookie-Editor JSON export or raw "key=value; ..." string.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = Body.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { creatorId, cookies } = body.data

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Parse cookies (JSON array or raw string)
  let parsed: { cookieStr: string; userId: string }
  try {
    const trimmed = cookies.trim()
    parsed = trimmed.startsWith('[')
      ? parseCookieEditorJson(trimmed)
      : parseCookieString(trimmed)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }

  // Validate the session against the real API
  const client = new OnlyFansClient({ cookieStr: parsed.cookieStr, userId: parsed.userId })
  let profile: Awaited<ReturnType<typeof client.getProfile>>
  try {
    profile = await client.getProfile()
  } catch (e) {
    if (e instanceof OfAuthError) {
      return NextResponse.json({ error: 'Session inválida ou expirada. Re-exporte os cookies.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Erro ao validar sessão no OnlyFans' }, { status: 502 })
  }

  // Upsert platform_token row
  const existing = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'onlyfans')),
  })

  const row = {
    // userId stored as accessToken (needed for signing headers)
    accessToken: parsed.userId,
    // cookie string stored as apiToken
    apiToken: parsed.cookieStr,
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

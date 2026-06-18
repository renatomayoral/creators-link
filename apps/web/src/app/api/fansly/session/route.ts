import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and, lt } from 'drizzle-orm'

const { verification, platformToken, creator } = schema

const FANSLY_API = 'https://apiv3.fansly.com/api/v1'

type FanslyAccountResponse = {
  success: boolean
  response?: {
    id: string
    username: string
    displayName?: string
    followerCount?: number
  }
}

async function fetchFanslyAccount(authToken: string, deviceId: string): Promise<FanslyAccountResponse['response']> {
  const res = await fetch(`${FANSLY_API}/account/me?ngsw-bypass=true`, {
    headers: {
      Authorization: authToken,
      'fansly-client-id': deviceId || '',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Origin: 'https://fansly.com',
      Referer: 'https://fansly.com/',
      Accept: 'application/json, text/plain, */*',
    },
  })
  if (!res.ok) throw new Error(`Fansly auth failed: ${res.status}`)
  const body = (await res.json()) as FanslyAccountResponse
  if (!body.success || !body.response) throw new Error('Invalid Fansly response')
  return body.response
}

async function saveSession(creatorId: string, authToken: string, deviceId: string) {
  const account = await fetchFanslyAccount(authToken, deviceId)

  const existing = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fansly')),
  })

  const row = {
    accessToken: account!.id,
    apiToken: authToken,
    platformUserId: account!.id,
    platformHandle: account!.username,
    // store deviceId in refreshToken field (no extra column needed)
    refreshToken: deviceId || null,
    expiresAt: null,
    scopes: [] as string[],
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(platformToken).set(row).where(eq(platformToken.id, existing.id))
  } else {
    await db.insert(platformToken).values({
      id: randomUUID(),
      creatorId,
      platform: 'fansly',
      ...row,
    })
  }

  return account
}

// GET /api/fansly/session?creatorId=xxx
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const token = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fansly')),
  })

  if (!token) return NextResponse.json({ connected: false })

  const expired = token.expiresAt?.getTime() === 0
  return NextResponse.json({
    connected: true,
    expired,
    handle: token.platformHandle,
    platformUserId: token.platformUserId,
  })
}

// POST /api/fansly/session — bookmarklet flow (token) or manual flow (auth session)
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    token?: string        // bookmarklet flow
    authToken?: string
    deviceId?: string
    creatorId?: string    // manual flow
  }

  // ── Bookmarklet flow ─────────────────────────────────────────────────────────
  if (body.token) {
    await db.delete(verification).where(lt(verification.expiresAt, new Date()))

    const row = await db.query.verification.findFirst({
      where: eq(verification.value, body.token),
    })
    if (!row) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })
    if (row.expiresAt < new Date()) {
      await db.delete(verification).where(eq(verification.id, row.id))
      return NextResponse.json({ error: 'Token expirado. Gere um novo favorito.' }, { status: 400 })
    }

    const creatorId = row.identifier.replace('fansly-bookmarklet:', '')
    await db.delete(verification).where(eq(verification.id, row.id))

    if (!body.authToken) return NextResponse.json({ error: 'authToken ausente' }, { status: 400 })

    try {
      await saveSession(creatorId, body.authToken, body.deviceId ?? '')
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  // ── Manual flow ──────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { creatorId, authToken, deviceId } = body
  if (!creatorId || !authToken) {
    return NextResponse.json({ error: 'creatorId e authToken são obrigatórios' }, { status: 400 })
  }

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const account = await saveSession(creatorId, authToken, deviceId ?? '')
    return NextResponse.json({ ok: true, handle: account?.username })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

// DELETE /api/fansly/session?creatorId=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  await db.delete(platformToken).where(
    and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fansly')),
  )
  return NextResponse.json({ ok: true })
}

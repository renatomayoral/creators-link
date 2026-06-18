import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { refreshAccessToken } from '@/lib/fanvue-oauth'

const { platformToken, creator } = schema

// GET /api/fanvue/status?creatorId=xxx
// Returns connection status + basic Fanvue profile. Refreshes token if expired.
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
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fanvue')),
  })

  if (!token) return NextResponse.json({ connected: false })

  // Refresh token if expired or expiring within 5 minutes
  if (token.expiresAt && token.refreshToken) {
    const expiresIn = token.expiresAt.getTime() - Date.now()
    if (expiresIn < 5 * 60 * 1000) {
      try {
        const refreshed = await refreshAccessToken(token.refreshToken)
        await db
          .update(platformToken)
          .set({
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
            expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
            updatedAt: new Date(),
          })
          .where(eq(platformToken.id, token.id))
      } catch {
        // Refresh failed — token may need re-auth
        return NextResponse.json({ connected: true, needsReauth: true })
      }
    }
  }

  return NextResponse.json({
    connected: true,
    needsReauth: false,
    handle: token.platformHandle,
    platformUserId: token.platformUserId,
    scopes: token.scopes,
    connectedAt: token.createdAt,
  })
}

// DELETE /api/fanvue/status?creatorId=xxx — disconnect Fanvue
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
    .where(and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fanvue')))

  return NextResponse.json({ ok: true })
}

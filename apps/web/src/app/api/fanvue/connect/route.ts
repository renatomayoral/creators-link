import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq } from 'drizzle-orm'
import { buildAuthUrl } from '@/lib/fanvue-oauth'

const { creator } = schema

// GET /api/fanvue/connect?creatorId=xxx
// Starts the Fanvue OAuth flow for a specific creator.
// Stores state=creatorId:nonce in cookie for CSRF protection.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  // Verify ownership
  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const nonce = randomUUID()
  const state = `${creatorId}:${nonce}`
  const authUrl = buildAuthUrl(state)

  const res = NextResponse.redirect(authUrl)
  // Store state in httpOnly cookie (15 min TTL) for CSRF validation in callback
  res.cookies.set('fanvue_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  })
  return res
}

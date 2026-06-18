import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { exchangeCode, getFanvueCurrentUser } from '@/lib/fanvue-oauth'

const { platformToken } = schema

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// GET /api/fanvue/callback?code=xxx&state=xxx
// Fanvue redirects here after the user authorizes. Exchanges code for tokens,
// fetches the Fanvue user profile, and upserts the platform_token row.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.redirect(new URL('/br/login', appUrl()))

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const locale = 'br'

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/${locale}/creators?fanvue=error&reason=${error ?? 'missing_params'}`, appUrl()),
    )
  }

  // CSRF: compare state with cookie
  const storedState = req.cookies.get('fanvue_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`/${locale}/creators?fanvue=error&reason=state_mismatch`, appUrl()),
    )
  }

  const [creatorId] = state.split(':')
  if (!creatorId) {
    return NextResponse.redirect(
      new URL(`/${locale}/creators?fanvue=error&reason=invalid_state`, appUrl()),
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Fetch Fanvue user profile
    const fanvueUser = await getFanvueCurrentUser(tokens.access_token)

    // Upsert platform_token row
    const existing = await db.query.platformToken.findFirst({
      where: and(
        eq(platformToken.creatorId, creatorId),
        eq(platformToken.platform, 'fanvue'),
      ),
    })

    const scopes = tokens.scope.split(' ')

    if (existing) {
      await db
        .update(platformToken)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          expiresAt,
          scopes,
          platformUserId: fanvueUser.uuid,
          platformHandle: fanvueUser.handle,
          updatedAt: new Date(),
        })
        .where(eq(platformToken.id, existing.id))
    } else {
      await db.insert(platformToken).values({
        id: randomUUID(),
        creatorId,
        platform: 'fanvue',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes,
        platformUserId: fanvueUser.uuid,
        platformHandle: fanvueUser.handle,
      })
    }

    // Clear state cookie and redirect back to creator page with success
    const res = NextResponse.redirect(
      new URL(`/${locale}/creators?fanvue=connected&creatorId=${creatorId}`, appUrl()),
    )
    res.cookies.delete('fanvue_oauth_state')
    return res
  } catch (err) {
    console.error('Fanvue OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/${locale}/creators?fanvue=error&reason=token_exchange`, appUrl()),
    )
  }
}

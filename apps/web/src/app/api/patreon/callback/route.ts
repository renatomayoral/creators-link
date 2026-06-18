import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { exchangePatreonCode, getPatreonIdentity, extractCampaignId } from '@/lib/patreon-oauth'

const { platformToken } = schema

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// GET /api/patreon/callback
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
      new URL(`/${locale}/creators?patreon=error&reason=${error ?? 'missing_params'}`, appUrl()),
    )
  }

  const storedState = req.cookies.get('patreon_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`/${locale}/creators?patreon=error&reason=state_mismatch`, appUrl()),
    )
  }

  const [creatorId] = state.split(':')
  if (!creatorId) {
    return NextResponse.redirect(
      new URL(`/${locale}/creators?patreon=error&reason=invalid_state`, appUrl()),
    )
  }

  try {
    const tokens = await exchangePatreonCode(code)
    const identity = await getPatreonIdentity(tokens.access_token)

    const patreonUserId = identity.data.id
    const handle = identity.data.attributes.vanity ?? identity.data.attributes.full_name
    const campaignId = extractCampaignId(identity)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const scopes = tokens.scope.split(' ')

    const existing = await db.query.platformToken.findFirst({
      where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'patreon')),
    })

    const row = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scopes,
      platformUserId: patreonUserId,
      // store campaignId in platformHandle prefix so we can fetch members later
      platformHandle: handle,
      // reuse apiToken field to store campaignId (no extra column needed)
      apiToken: campaignId ?? undefined,
      updatedAt: new Date(),
    }

    if (existing) {
      await db.update(platformToken).set(row).where(eq(platformToken.id, existing.id))
    } else {
      await db.insert(platformToken).values({
        id: randomUUID(),
        creatorId,
        platform: 'patreon',
        ...row,
      })
    }

    const res = NextResponse.redirect(
      new URL(`/${locale}/creators?patreon=connected&creatorId=${creatorId}`, appUrl()),
    )
    res.cookies.delete('patreon_oauth_state')
    return res
  } catch (err) {
    console.error('Patreon OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/${locale}/creators?patreon=error&reason=token_exchange`, appUrl()),
    )
  }
}

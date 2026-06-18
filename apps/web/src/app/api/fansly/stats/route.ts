import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'

const { platformToken } = schema

const FANSLY_API = 'https://apiv3.fansly.com/api/v1'

function fanslyHeaders(authToken: string, deviceId: string) {
  return {
    Authorization: authToken,
    'fansly-client-id': deviceId,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Origin: 'https://fansly.com',
    Referer: 'https://fansly.com/',
    Accept: 'application/json, text/plain, */*',
  }
}

async function fanslyGet<T>(path: string, authToken: string, deviceId: string): Promise<T> {
  const res = await fetch(`${FANSLY_API}${path}`, {
    headers: fanslyHeaders(authToken, deviceId),
  })
  if (res.status === 401) throw new Error('FANSLY_AUTH_ERROR')
  if (!res.ok) throw new Error(`Fansly API ${res.status}: ${path}`)
  return res.json()
}

type FanslyAccountMe = {
  success: boolean
  response?: {
    id: string
    username: string
    displayName?: string
    followerCount?: number
    subscriberCount?: number
  }
}

type FanslySubscribers = {
  success: boolean
  response?: {
    subscriptions?: Array<{ id: string; status: number }>
    total?: number
  }
}

// GET /api/fansly/stats?creatorId=xxx
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const token = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fansly')),
  })

  if (!token?.apiToken) return NextResponse.json({ error: 'Fansly não conectado' }, { status: 404 })

  const authToken = token.apiToken
  const deviceId = token.refreshToken ?? ''

  try {
    const [accountRes, subscribersRes] = await Promise.all([
      fanslyGet<FanslyAccountMe>('/account/me?ngsw-bypass=true', authToken, deviceId),
      fanslyGet<FanslySubscribers>('/subscribers?ngsw-bypass=true', authToken, deviceId).catch(() => null),
    ])

    if (!accountRes.success) throw new Error('FANSLY_AUTH_ERROR')

    const account = accountRes.response!
    const subscriberCount =
      subscribersRes?.response?.total ??
      subscribersRes?.response?.subscriptions?.length ??
      account.subscriberCount ??
      null

    return NextResponse.json({
      handle: account.username,
      displayName: account.displayName,
      followers: account.followerCount ?? null,
      subscribers: subscriberCount,
    })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'FANSLY_AUTH_ERROR') {
      // Mark as expired
      await db
        .update(platformToken)
        .set({ expiresAt: new Date(0), updatedAt: new Date() })
        .where(and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fansly')))
      return NextResponse.json({ expired: true }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

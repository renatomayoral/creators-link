import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { OnlyFansClient, OfAuthError } from '@repo/onlyfans-client'

const { platformToken, creator } = schema

// GET /api/onlyfans/stats?creatorId=xxx
// Fetches fresh stats from OnlyFans using the stored session.
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

  if (!token || !token.apiToken) {
    return NextResponse.json({ error: 'No OnlyFans session — save cookies first' }, { status: 404 })
  }

  const client = new OnlyFansClient({
    cookieStr: token.apiToken,
    userId: token.accessToken,
  })

  try {
    const stats = await client.getAllStats()
    return NextResponse.json(stats)
  } catch (e) {
    if (e instanceof OfAuthError) {
      return NextResponse.json(
        { error: 'Sessão expirada. Re-exporte os cookies do OnlyFans.', expired: true },
        { status: 401 },
      )
    }
    console.error('OnlyFans stats fetch error:', e)
    return NextResponse.json({ error: 'Erro ao buscar dados do OnlyFans' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const { platformToken, creator } = schema

const Body = z.object({ apiToken: z.string().min(10) })

// POST /api/fanvue/token?creatorId=xxx — save a manual API token (OAuth fallback)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = Body.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const existing = await db.query.platformToken.findFirst({
    where: and(eq(platformToken.creatorId, creatorId), eq(platformToken.platform, 'fanvue')),
  })

  if (existing) {
    await db
      .update(platformToken)
      .set({ apiToken: body.data.apiToken, updatedAt: new Date() })
      .where(eq(platformToken.id, existing.id))
  } else {
    await db.insert(platformToken).values({
      id: randomUUID(),
      creatorId,
      platform: 'fanvue',
      accessToken: body.data.apiToken, // treat as access token for api-token-only flow
      apiToken: body.data.apiToken,
      scopes: [],
    })
  }

  return NextResponse.json({ ok: true })
}

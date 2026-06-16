import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { platformMeta, slugify, type CreatorListRow } from '@/lib/creators'

const { creator, creatorLink, linkClick, platform } = schema

// ─── GET /api/creators — list the signed-in user's creators + 30d metrics ────

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creators = await db.query.creator.findMany({
    where: eq(creator.userId, session.user.id),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })

  if (!creators.length) return NextResponse.json([])

  const creatorIds = creators.map((c) => c.id)

  // 4 bulk queries — one per metric, for ALL creators at once
  const [curr30, prev30, byPlatform, trendRows] = await Promise.all([
    db
      .select({ creatorId: linkClick.creatorId, n: sql<number>`count(*)::int` })
      .from(linkClick)
      .where(and(inArray(linkClick.creatorId, creatorIds), gte(linkClick.createdAt, sql`now() - interval '30 days'`)))
      .groupBy(linkClick.creatorId),
    db
      .select({ creatorId: linkClick.creatorId, n: sql<number>`count(*)::int` })
      .from(linkClick)
      .where(and(
        inArray(linkClick.creatorId, creatorIds),
        gte(linkClick.createdAt, sql`now() - interval '60 days'`),
        sql`${linkClick.createdAt} < now() - interval '30 days'`,
      ))
      .groupBy(linkClick.creatorId),
    db
      .select({
        creatorId: creatorLink.creatorId,
        platform: creatorLink.platform,
        n: sql<number>`count(${linkClick.id})::int`,
      })
      .from(creatorLink)
      .leftJoin(linkClick, and(
        eq(linkClick.linkId, creatorLink.id),
        gte(linkClick.createdAt, sql`now() - interval '30 days'`),
      ))
      .where(inArray(creatorLink.creatorId, creatorIds))
      .groupBy(creatorLink.creatorId, creatorLink.platform),
    db
      .select({
        creatorId: linkClick.creatorId,
        day: sql<string>`date_trunc('day', ${linkClick.createdAt})`,
        n: sql<number>`count(*)::int`,
      })
      .from(linkClick)
      .where(and(
        inArray(linkClick.creatorId, creatorIds),
        gte(linkClick.createdAt, sql`now() - interval '12 days'`),
      ))
      .groupBy(linkClick.creatorId, sql`2`)
      .orderBy(linkClick.creatorId, sql`2`),
  ])

  const curr30Map = new Map(curr30.map((r) => [r.creatorId, r.n]))
  const prev30Map = new Map(prev30.map((r) => [r.creatorId, r.n]))
  const byPlatformMap = new Map<string, typeof byPlatform>()
  for (const r of byPlatform) {
    const arr = byPlatformMap.get(r.creatorId) ?? []
    arr.push(r)
    byPlatformMap.set(r.creatorId, arr)
  }
  const trendMap = new Map<string, typeof trendRows>()
  for (const r of trendRows) {
    const arr = trendMap.get(r.creatorId) ?? []
    arr.push(r)
    trendMap.set(r.creatorId, arr)
  }

  const rows: CreatorListRow[] = creators.map((c) => {
    const clicks30d = curr30Map.get(c.id) ?? 0
    const prev30d = prev30Map.get(c.id) ?? 0
    const change = prev30d === 0 ? (clicks30d > 0 ? 100 : 0) : Math.round(((clicks30d - prev30d) / prev30d) * 1000) / 10

    const platforms = byPlatformMap.get(c.id) ?? []
    const top = [...platforms].sort((a, b) => (b.n ?? 0) - (a.n ?? 0))[0]
    const topLink = top && (top.n ?? 0) > 0
      ? { platform: top.platform, ...platformMeta(top.platform) }
      : null

    const dayRows = trendMap.get(c.id) ?? []
    const counts = dayRows.map((r) => r.n)
    const maxCount = Math.max(1, ...counts)
    const trend = Array.from({ length: 12 }, (_, i) =>
      Math.round(((counts[i] ?? 0) / maxCount) * 100),
    )

    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      slug: c.slug,
      avatarUrl: c.avatarUrl,
      customDomain: c.customDomain ?? null,
      status: c.status as 'live' | 'draft',
      clicks30d,
      change,
      topLink: topLink ? { platform: topLink.platform, label: topLink.label, color: topLink.color } : null,
      trend,
    }
  })

  return NextResponse.json(rows)
}

// ─── POST /api/creators — create a page (name → slug + default links) ─────────

const createSchema = z.object({
  name: z.string().min(2).max(60),
  handle: z.string().max(60).optional(),
  avatarUrl: z.string().url().optional(),
  platformKeys: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, handle, avatarUrl, platformKeys } = parsed.data

  // fetch active platforms from DB
  const allPlatforms = await db.select().from(platform).where(eq(platform.active, true)).orderBy(asc(platform.sortOrder))

  // filter to requested keys, or use all active platforms
  const chosen = platformKeys?.length
    ? allPlatforms.filter((p) => platformKeys.includes(p.key))
    : allPlatforms

  // ensure a unique slug
  let slug = slugify(name)
  const existing = await db.query.creator.findFirst({ where: eq(creator.slug, slug) })
  if (existing) slug = `${slug}-${randomUUID().slice(0, 4)}`

  const creatorId = randomUUID()
  await db.insert(creator).values({
    id: creatorId,
    userId: session.user.id,
    name,
    slug,
    handle: handle ?? `@${slug.replace(/-/g, '')}`,
    avatarUrl: avatarUrl ?? null,
    status: 'draft',
  })

  if (chosen.length) {
    await db.insert(creatorLink).values(
      chosen.map((p, i) => ({
        id: randomUUID(),
        creatorId,
        platform: p.key,
        label: p.label,
        url: p.baseUrl,
        sortOrder: i,
      })),
    )
  }

  return NextResponse.json({ id: creatorId, slug }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { and, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import {
  PLATFORMS,
  PLATFORM_KEYS,
  platformMeta,
  slugify,
  type CreatorListRow,
} from '@/lib/creators'

const { creator, creatorLink, linkClick } = schema

// ─── GET /api/creators — list the signed-in user's creators + 30d metrics ────

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creators = await db.query.creator.findMany({
    where: eq(creator.userId, session.user.id),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })

  const rows: CreatorListRow[] = await Promise.all(
    creators.map(async (c) => {
      // clicks in the last 30d and the 30d before that (for % change)
      const [curr, prev, byPlatform, trendRows] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(linkClick)
          .where(
            and(
              eq(linkClick.creatorId, c.id),
              gte(linkClick.createdAt, sql`now() - interval '30 days'`),
            ),
          ),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(linkClick)
          .where(
            and(
              eq(linkClick.creatorId, c.id),
              gte(linkClick.createdAt, sql`now() - interval '60 days'`),
              sql`${linkClick.createdAt} < now() - interval '30 days'`,
            ),
          ),
        db
          .select({
            platform: creatorLink.platform,
            n: sql<number>`count(${linkClick.id})::int`,
          })
          .from(creatorLink)
          .leftJoin(
            linkClick,
            and(
              eq(linkClick.linkId, creatorLink.id),
              gte(linkClick.createdAt, sql`now() - interval '30 days'`),
            ),
          )
          .where(eq(creatorLink.creatorId, c.id))
          .groupBy(creatorLink.platform),
        db
          .select({
            day: sql<string>`date_trunc('day', ${linkClick.createdAt})`,
            n: sql<number>`count(*)::int`,
          })
          .from(linkClick)
          .where(
            and(
              eq(linkClick.creatorId, c.id),
              gte(linkClick.createdAt, sql`now() - interval '12 days'`),
            ),
          )
          .groupBy(sql`1`)
          .orderBy(sql`1`),
      ])

      const clicks30d = curr[0]?.n ?? 0
      const prev30d = prev[0]?.n ?? 0
      const change = prev30d === 0 ? (clicks30d > 0 ? 100 : 0) : Math.round(((clicks30d - prev30d) / prev30d) * 1000) / 10

      const top = [...byPlatform].sort((a, b) => (b.n ?? 0) - (a.n ?? 0))[0]
      const topLink = top && (top.n ?? 0) > 0
        ? { platform: top.platform, ...platformMeta(top.platform) }
        : null

      // build a 12-bucket sparkline (0–100)
      const counts = trendRows.map((r) => r.n)
      const max = Math.max(1, ...counts)
      const trend = Array.from({ length: 12 }, (_, i) =>
        Math.round(((counts[i] ?? 0) / max) * 100),
      )

      return {
        id: c.id,
        name: c.name,
        handle: c.handle,
        slug: c.slug,
        avatarUrl: c.avatarUrl,
        status: c.status as 'live' | 'draft',
        clicks30d,
        change,
        topLink: topLink
          ? { platform: topLink.platform, label: topLink.label, color: topLink.color }
          : null,
        trend,
      }
    }),
  )

  return NextResponse.json(rows)
}

// ─── POST /api/creators — create a page (name → slug + default links) ─────────

const createSchema = z.object({
  name: z.string().min(2).max(60),
  handle: z.string().max(60).optional(),
  platforms: z.array(z.enum(PLATFORM_KEYS as [string, ...string[]])).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, handle, platforms } = parsed.data

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
    status: 'draft',
  })

  const chosen = platforms?.length ? platforms : (['onlyfans', 'instagram'] as const)
  await db.insert(creatorLink).values(
    chosen.map((p, i) => ({
      id: randomUUID(),
      creatorId,
      platform: p,
      label: PLATFORMS[p as keyof typeof PLATFORMS]?.label ?? p,
      url: PLATFORMS[p as keyof typeof PLATFORMS]?.baseUrl ?? '#',
      sortOrder: i,
    })),
  )

  return NextResponse.json({ id: creatorId, slug }, { status: 201 })
}

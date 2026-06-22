import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { platformMeta, type ConnectedPlatform, type CreatorDetail } from '@/lib/creators'

const { creator, creatorLink, linkClick, platformToken } = schema

async function ownedCreator(id: string, userId: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c || c.userId !== userId) return null
  return c
}

// ─── GET /api/creators/[id] — full detail + 14d series + per-platform totals ──

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const links = await db.query.creatorLink.findMany({
    where: eq(creatorLink.creatorId, id),
    orderBy: (l, { asc }) => [asc(l.sortOrder)],
  })

  const [perLink, dailyRows, platformTokens] = await Promise.all([
    db
      .select({ linkId: linkClick.linkId, n: sql<number>`count(*)::int` })
      .from(linkClick)
      .where(
        and(eq(linkClick.creatorId, id), gte(linkClick.createdAt, sql`now() - interval '30 days'`)),
      )
      .groupBy(linkClick.linkId),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${linkClick.createdAt}), 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(linkClick)
      .where(
        and(eq(linkClick.creatorId, id), gte(linkClick.createdAt, sql`now() - interval '14 days'`)),
      )
      .groupBy(sql`1`),
    db.query.platformToken.findMany({ where: eq(platformToken.creatorId, id) }),
  ])

  const clicksByLink = new Map(perLink.map((r) => [r.linkId, r.n]))
  const linkStats = links.map((l) => {
    const meta = platformMeta(l.platform)
    return {
      id: l.id,
      platform: l.platform,
      label: l.label ?? meta.label,
      url: l.url,
      color: meta.color,
      clicks: clicksByLink.get(l.id) ?? 0,
    }
  })

  const total = linkStats.reduce((s, l) => s + l.clicks, 0)
  const maxLink = Math.max(1, ...linkStats.map((l) => l.clicks))
  const linksWithPct = linkStats
    .sort((a, b) => b.clicks - a.clicks)
    .map((l) => ({
      ...l,
      pct: total === 0 ? 0 : Math.round((l.clicks / total) * 100),
      barPct: Math.round((l.clicks / maxLink) * 100),
    }))

  // fill a contiguous 14-day array (oldest → today)
  const byDay = new Map(dailyRows.map((r) => [r.day, r.n]))
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().slice(0, 10)
    return byDay.get(key) ?? 0
  })

  const platformConnections: ConnectedPlatform[] = platformTokens.map((t) => ({
    platform: t.platform,
    handle: t.platformHandle,
    platformUserId: t.platformUserId,
    expired: t.expiresAt?.getTime() === 0,
  }))

  const detail: CreatorDetail = {
    id: c.id,
    name: c.name,
    handle: c.handle,
    slug: c.slug,
    bio: c.bio,
    avatarUrl: c.avatarUrl,
    accentColor: c.accentColor,
    customDomain: c.customDomain ?? null,
    stripeOnboarded: c.stripeOnboarded,
    status: c.status as 'live' | 'draft',
    totalClicks30d: total,
    daily,
    links: linksWithPct,
    platformConnections,
  }

  return NextResponse.json(detail)
}

// ─── PATCH /api/creators/[id] — edit profile fields ──────────────────────────

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  handle: z.string().max(60).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  status: z.enum(['live', 'draft']).optional(),
  telegramChannelId: z.string().max(200).nullable().optional(),
  telegramChannelTitle: z.string().max(200).nullable().optional(),
  channelPhotoUrl: z.string().max(500).nullable().optional(),
  pixKey: z.string().max(200).nullable().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).nullable().optional(),
  platformFeePct: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).optional(),
  acceptedPayments: z.array(z.enum(['stripe', 'pix_manual', 'pix_auto'])).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await db
    .update(creator)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(creator.id, id))

  return NextResponse.json({ ok: true })
}

// ─── DELETE /api/creators/[id] ───────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await ownedCreator(id, session.user.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(creator).where(eq(creator.id, id)) // cascades to links + clicks
  return NextResponse.json({ ok: true })
}

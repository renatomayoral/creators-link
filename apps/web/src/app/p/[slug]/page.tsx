import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { resolveConfig } from '@/lib/page-templates'
import { PublicProfileView } from '@/components/public-profile-view'

const { creator, creatorLink, vipPlan, vipPlanPrice } = schema

export const revalidate = 60

async function getCreator(slug: string) {
  const c = await db.query.creator.findFirst({ where: eq(creator.slug, slug) })
  if (!c) return null
  const hasPayments = c.stripeOnboarded || (c.acceptedPayments?.length ?? 0) > 0
  const [links, plans] = await Promise.all([
    db.query.creatorLink.findMany({
      where: eq(creatorLink.creatorId, c.id),
      orderBy: (l, { asc }) => [asc(l.sortOrder)],
    }),
    hasPayments
      ? db.query.vipPlan.findMany({
          where: eq(vipPlan.creatorId, c.id),
          orderBy: (p, { asc }) => [asc(p.intervalDay)],
        })
      : Promise.resolve([]),
  ])
  const activePlans = plans.filter((p) => p.active)
  const planIds = activePlans.map((p) => p.id)
  const prices =
    planIds.length > 0
      ? await db.query.vipPlanPrice.findMany({
          where: (vpp, { inArray }) => inArray(vpp.planId, planIds),
        })
      : []
  const pricesByPlan = prices.reduce<Record<string, typeof prices>>((acc, pr) => {
    ;(acc[pr.planId] ??= []).push(pr)
    return acc
  }, {})
  return {
    ...c,
    links: links.filter((l) => l.active),
    plans: activePlans.map((p) => ({ ...p, prices: pricesByPlan[p.id] ?? [] })),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = await getCreator(slug)
  if (!c) return { title: 'Página não encontrada' }
  return {
    title: `${c.name} — Links`,
    description: c.bio ?? `${c.name} · links e conteúdo exclusivo.`,
    openGraph: {
      title: c.name,
      description: c.bio ?? undefined,
      images: c.avatarUrl ? [c.avatarUrl] : [],
    },
    robots: { index: true, follow: true },
  }
}

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getCreator(slug)
  if (!c) notFound()

  const cfg = resolveConfig(
    c.pageTemplate ?? 'neon-dark',
    (() => {
      try {
        return c.pageConfig ? JSON.parse(c.pageConfig) : null
      } catch {
        return null
      }
    })(),
  )

  return (
    <PublicProfileView
      mode="live"
      cfg={cfg}
      creator={{ name: c.name, handle: c.handle, bio: c.bio, avatarUrl: c.avatarUrl }}
      links={c.links.map((l) => ({ id: l.id, platform: l.platform, label: l.label, url: l.url }))}
      plans={c.plans.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        intervalDay: p.intervalDay,
        prices: p.prices.map((pr) => ({
          currency: pr.currency,
          amountCents: pr.amountCents,
          provider: pr.provider,
        })),
      }))}
    />
  )
}


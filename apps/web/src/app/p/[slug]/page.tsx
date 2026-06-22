import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { platformMeta } from '@/lib/creators'
import { VipPlans } from './vip-plans'

const { creator, creatorLink, vipPlan, vipPlanPrice } = schema

export const revalidate = 60 // ISR: regenerate the page at most once a minute

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
  const prices = planIds.length > 0
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

  const accent = c.accentColor || '#ec4899'
  const featured = c.links[0]
  const rest = c.links.slice(1)

  return (
    <div
      className="flex min-h-screen justify-center px-4"
      style={{ background: 'radial-gradient(620px 460px at 50% -4%, #2a1230 0%, #0a0a0c 60%)' }}
    >
      <div
        aria-hidden
        className="animate-cglow pointer-events-none fixed -top-20 left-1/2 h-110 w-130 max-w-[96vw] -translate-x-1/2 blur-[50px]"
        style={{
          background: `radial-gradient(circle, ${accent} 0%, transparent 60%)`,
          opacity: 0.4,
        }}
      />

      <main className="relative w-full max-w-107.5 px-1.5 pt-16 pb-12 text-center text-white">
        {/* avatar with animated ring */}
        <div className="animate-cfloat relative mx-auto h-33 w-33">
          <div
            className="animate-cspin absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${accent}, #7c3aed, #f472b6, #a78bfa, ${accent})`,
              filter: 'drop-shadow(0 0 16px rgba(236,72,153,.6))',
            }}
          />
          <div className="absolute inset-1 rounded-full" style={{ background: '#0a0a0c' }} />
          {c.avatarUrl ? (
            <Image
              src={c.avatarUrl}
              alt={c.name}
              fill
              priority
              sizes="132px"
              className="absolute inset-2 h-[calc(100%-16px)]! w-[calc(100%-16px)]! rounded-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-2 flex items-center justify-center rounded-full text-3xl font-black"
              style={{ background: 'linear-gradient(135deg,#6d5dfc,#22d3ee)' }}
            >
              {c.name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </div>
          )}
        </div>

        <h1 className="mt-5 inline-flex items-center gap-2 text-[28px] font-black tracking-tight">
          <span className="bg-linear-to-br from-white to-pink-300 bg-clip-text text-transparent">
            {c.name}
          </span>
          <VerifiedBadge color={accent} />
        </h1>

        {c.handle && (
          <div
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
            style={{
              background: 'rgba(236,72,153,.12)',
              border: '1px solid rgba(236,72,153,.3)',
              color: '#f9a8d4',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }}
            />
            {c.handle}
          </div>
        )}

        {c.bio && (
          <p
            className="mx-auto mt-4 max-w-82.5 text-[15px] leading-relaxed"
            style={{ color: '#c4c4cc' }}
          >
            {c.bio}
          </p>
        )}

        {/* featured link */}
        {featured && (
          <a
            href={`/r/${featured.id}`}
            className="mt-7 block rounded-[22px] p-4.5 text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg,rgba(236,72,153,.16),rgba(124,58,237,.16))',
              border: '1px solid rgba(236,72,153,.3)',
              boxShadow: '0 0 36px -8px rgba(236,72,153,.45)',
            }}
          >
            <div className="flex items-center gap-3">
              <LinkTile platform={featured.platform} size={48} />
              <div className="flex-1">
                <div className="text-[16.5px] font-extrabold">
                  {featured.label ?? platformMeta(featured.platform).label}
                </div>
                <div className="text-[12.5px]" style={{ color: '#d4b8e8' }}>
                  Acesso completo · conteúdo exclusivo
                </div>
              </div>
              <span
                className="rounded-[10px] px-2.5 py-1 text-xs font-extrabold"
                style={{ background: '#f9a8d4', color: '#0a0a0c' }}
              >
                ABRIR
              </span>
            </div>
          </a>
        )}

        {/* secondary links — two per row */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-left">
          {rest.map((l) => {
            const meta = platformMeta(l.platform)
            return (
              <a
                key={l.id}
                href={`/r/${l.id}`}
                className="flex items-center justify-center gap-2.5 rounded-[15px] p-3.75 text-[14.5px] font-semibold transition-transform hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                }}
              >
                <LinkTile platform={l.platform} size={24} />
                {l.label ?? meta.label}
              </a>
            )
          })}
        </div>

        {/* VIP subscription plans — map explicitly so internal ids (stripe/now) don't leak */}
        <VipPlans
          accent={accent}
          plans={c.plans.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            intervalDay: p.intervalDay,
            prices: p.prices.map(pr => ({
              currency: pr.currency,
              amountCents: pr.amountCents,
              provider: pr.provider,
            })),
          }))}
        />

        <div
          className="mt-9 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wider"
          style={{ color: '#52525b' }}
        >
          <span className="rounded-md border px-1.5 py-0.5" style={{ borderColor: '#3f3f46' }}>
            18+
          </span>
          <span>All content is intended for adults only</span>
        </div>
        <div className="mt-3.5 text-[11px]" style={{ color: '#3f3f46' }}>
          © {new Date().getFullYear()} {c.name}
        </div>
      </main>
    </div>
  )
}

function VerifiedBadge({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-label="Verified">
      <path
        d="M12 2l2.4 1.8 3-.2 1 2.8 2.5 1.6-.9 2.9.9 2.9-2.5 1.6-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3.1 16l.9-2.9-.9-2.9L5.6 6.6l1-2.8 3 .2z"
        fill={color}
      />
      <path
        d="M8.5 12.2l2.3 2.3 4.6-4.8"
        fill="none"
        stroke="#0a0a0c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LinkTile({ platform, size }: { platform: string; size: number }) {
  const meta = platformMeta(platform)
  const radius = size >= 44 ? 14 : size >= 36 ? 11 : 8
  return (
    <span
      className="flex shrink-0 items-center justify-center font-extrabold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: meta.color,
        fontSize: size >= 44 ? 16 : 13,
      }}
    >
      {meta.label.slice(0, 2).toUpperCase()}
    </span>
  )
}

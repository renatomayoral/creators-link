import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { platformMeta } from '@/lib/creators'
import { resolveConfig } from '@/lib/page-templates'
import { PlatformLogo } from '@/components/platform-logos'
import { VipPlans } from './vip-plans'

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

  const accent = cfg.accentColor

  const btnRadius =
    cfg.buttonStyle === 'pill' ? '22px' : cfg.buttonStyle === 'sharp' ? '6px' : '14px'
  const isLight = cfg.bgFrom.startsWith('#f') || cfg.bgFrom === '#ffffff'

  return (
    <div
      className="flex min-h-screen justify-center px-4"
      style={{
        background: `radial-gradient(620px 460px at 50% -4%, ${cfg.bgFrom} 0%, ${cfg.bgTo} 60%)`,
        fontFamily: cfg.fontFamily,
        color: cfg.textColor,
      }}
    >
      {cfg.glowOpacity > 0 && (
        <div
          aria-hidden
          className="animate-cglow pointer-events-none fixed -top-20 left-1/2 h-110 w-130 max-w-[96vw] -translate-x-1/2 blur-[50px]"
          style={{
            background: `radial-gradient(circle, ${accent} 0%, transparent 60%)`,
            opacity: cfg.glowOpacity,
          }}
        />
      )}

      <main className="relative w-full max-w-107.5 px-1.5 pt-16 pb-12 text-center">
        {/* avatar */}
        <div className="animate-cfloat relative mx-auto h-33 w-33">
          <div
            className="animate-cspin absolute inset-0 rounded-full"
            style={{
              background: cfg.avatarRing,
              filter: cfg.glowOpacity > 0 ? `drop-shadow(0 0 16px ${accent}99)` : 'none',
            }}
          />
          <div className="absolute inset-1 rounded-full" style={{ background: cfg.bgTo }} />
          {c.avatarUrl ? (
            <div className="absolute inset-2 overflow-hidden rounded-full">
              <Image
                src={c.avatarUrl}
                alt={c.name}
                fill
                priority
                sizes="116px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="absolute inset-2 flex items-center justify-center rounded-full text-3xl font-black"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${cfg.mutedColor})`,
                color: isLight ? '#fff' : cfg.bgTo,
              }}
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
          <span style={{ color: cfg.textColor }}>{c.name}</span>
          <VerifiedBadge color={accent} />
        </h1>

        {c.handle && (
          <div
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
            style={{
              background: `${accent}1a`,
              border: `1px solid ${accent}4d`,
              color: cfg.mutedColor,
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
            style={{ color: cfg.mutedColor }}
          >
            {c.bio}
          </p>
        )}

        {/* all links — uniform card style, only icon changes */}
        <div className="mt-7 flex flex-col gap-2.5">
          {c.links.map((l) => {
            const label = l.label ?? platformMeta(l.platform).label
            return (
              <a
                key={l.id}
                href={`/r/${l.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
                style={{
                  background: cfg.cardBg,
                  border: `1px solid ${cfg.cardBorder}`,
                  boxShadow: cfg.glowOpacity > 0 ? `0 0 28px -8px ${accent}55` : '0 1px 8px rgba(0,0,0,.06)',
                  borderRadius: btnRadius,
                  color: cfg.textColor,
                }}
              >
                <PlatformLogo platform={l.platform} size={40} />
                <span className="flex-1 text-[15px] font-bold">{label}</span>
                <span
                  className="px-3 py-1 text-[11px] font-extrabold tracking-wide"
                  style={{
                    background: accent,
                    color: isLight ? '#fff' : '#0a0a0c',
                    borderRadius: btnRadius,
                  }}
                >
                  ABRIR
                </span>
              </a>
            )
          })}
        </div>

        <VipPlans
          accent={accent}
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

        <div className="mt-9 text-[11px]" style={{ color: isLight ? '#a1a1aa' : '#3f3f46' }}>
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


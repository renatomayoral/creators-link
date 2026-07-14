'use client'

import Image from 'next/image'
import type { PageConfig } from '@/lib/page-templates'
import { platformMeta } from '@/lib/creators'
import { PlatformLogo } from '@/components/platform-logos'
import { VipPlans, type PublicVipPlan } from '@/app/p/[slug]/vip-plans'

export type PublicProfileLink = {
  id: string
  platform: string
  label: string | null
  url: string
}

export type PublicProfileCreator = {
  name: string
  handle: string | null
  bio: string | null
  avatarUrl: string | null
}

type Props = {
  creator: PublicProfileCreator
  links: PublicProfileLink[]
  plans: PublicVipPlan[]
  cfg: PageConfig
  /** 'live' renders real navigable links; 'preview' disables navigation (used inside the editor). */
  mode?: 'live' | 'preview'
}

export function PublicProfileView({ creator: c, links, plans, cfg, mode = 'live' }: Props) {
  const accent = cfg.accentColor
  const btnRadius = cfg.buttonStyle === 'pill' ? '22px' : cfg.buttonStyle === 'sharp' ? '6px' : '14px'
  const isLight = cfg.bgFrom.startsWith('#f') || cfg.bgFrom === '#ffffff'
  const isPreview = mode === 'preview'

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
              {isPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={c.avatarUrl}
                  alt={c.name}
                  fill
                  priority
                  sizes="116px"
                  className="object-cover"
                />
              )}
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

        <h1 className="mt-5 flex items-center justify-center gap-2 text-[28px] font-black tracking-tight">
          <span style={{ color: cfg.textColor }}>{c.name}</span>
          <VerifiedBadge color={accent} />
        </h1>

        {c.handle && (
          <div
            className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold mx-auto"
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
          {links.map((l) => {
            const label = l.label ?? platformMeta(l.platform).label
            return (
              <a
                key={l.id}
                href={isPreview ? undefined : `/r/${l.id}`}
                target={isPreview ? undefined : '_blank'}
                rel={isPreview ? undefined : 'noopener noreferrer'}
                onClick={isPreview ? (e) => e.preventDefault() : undefined}
                aria-disabled={isPreview || undefined}
                className="flex w-full items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
                style={{
                  background: cfg.cardBg,
                  border: `1px solid ${cfg.cardBorder}`,
                  boxShadow: cfg.glowOpacity > 0 ? `0 0 28px -8px ${accent}55` : '0 1px 8px rgba(0,0,0,.06)',
                  borderRadius: btnRadius,
                  color: cfg.textColor,
                  cursor: isPreview ? 'default' : undefined,
                }}
              >
                <PlatformLogo platform={l.platform} size={40} />
                <span className="flex-1 text-[15px] font-bold">{label}</span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center"
                  style={{
                    background: accent,
                    borderRadius: btnRadius,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke={isLight ? '#fff' : '#0a0a0c'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </a>
            )
          })}
        </div>

        <VipPlans accent={accent} plans={plans} />

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

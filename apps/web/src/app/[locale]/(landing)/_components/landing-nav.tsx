'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleSwitcher } from '@/components/locale-switcher'

const ACCENT = '#7C3AED'

const NAV_LINKS = [
  ['#recursos', 'Recursos'],
  ['#como', 'Como funciona'],
  ['#precos', 'Preços'],
  ['#faq', 'Dúvidas'],
] as const

export function LandingNav() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isLight = mounted && theme === 'light'

  const navBg = isLight ? 'rgba(255,255,255,.88)' : 'rgba(2,8,23,.72)'
  const navBorder = isLight ? '#e2e8f0' : '#11203a'
  const linkColor = isLight ? '#475569' : '#94a3b8'
  const signInColor = isLight ? '#334155' : '#cbd5e1'
  const logoSrc = isLight ? '/logo-wordmark-light.svg' : '/logo-wordmark-dark.svg'

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${navBorder}`,
        background: navBg,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Creators Link" height={28} style={{ height: 28, width: 'auto' }} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              style={{
                padding: '8px 13px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: linkColor,
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: signInColor,
              padding: '8px 6px',
              textDecoration: 'none',
            }}
          >
            Entrar
          </Link>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 9,
              background: ACCENT,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: `0 8px 22px -8px ${ACCENT}`,
            }}
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  )
}

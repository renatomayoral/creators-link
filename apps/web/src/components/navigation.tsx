'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@repo/ui/lib/utils'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { authClient } from '@repo/auth/client'
import { ThemeToggle } from './theme-toggle'
import { LocaleSwitcher } from './locale-switcher'

export function Navigation() {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: `/${locale}/admin`, label: t('navigation.dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/creators`, label: t('navigation.creators'), icon: Users },
    { href: `/${locale}/settings`, label: t('navigation.settings'), icon: Settings },
  ]

  const logoSrc =
    mounted && theme === 'light' ? '/logo-wordmark-light.svg' : '/logo-wordmark-dark.svg'

  return (
    <nav className="sticky top-0 z-40 border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-6">
          <Link href={`/${locale}/admin`} className="flex shrink-0 items-center">
            <Image src={logoSrc} alt="Creators Link" width={160} height={29} priority />
          </Link>

          <div className="flex flex-1 items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === href || (href !== `/${locale}/admin` && pathname.startsWith(href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />

            {session?.user && (
              <>
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? 'User avatar'}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                    {(session.user.name ?? session.user.email ?? 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  title={t('navigation.signOut')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('navigation.signOut')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

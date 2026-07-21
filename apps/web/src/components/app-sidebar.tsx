'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { LayoutDashboard, Users, Settings, LogOut, Gift, ChevronsUpDown, CreditCard, ArrowUpCircle } from 'lucide-react'
import { authClient } from '@repo/auth/client'
import { PLANS } from '@repo/payments/plans'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@repo/ui/components/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu'
import { ThemeToggle } from './theme-toggle'

function SidebarLogo() {
  const { state } = useSidebar()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const collapsed = state === 'collapsed'
  const wordmarkSrc = mounted && theme === 'light' ? '/logo-wordmark-light.svg' : '/logo-wordmark-dark.svg'

  if (collapsed) {
    return (
      <Image src="/logo-icon.svg" alt="Creators Link" width={24} height={24} priority />
    )
  }

  return (
    <Image src={wordmarkSrc} alt="Creators Link" width={120} height={22} priority />
  )
}

export function AppSidebar() {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const { data: subscriptions } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const res = await authClient.subscription.list()
      return res.data ?? []
    },
    enabled: !!session,
  })
  const activePlan = subscriptions?.find(s => s.status === 'active' || s.status === 'trialing')
  const planLabel = PLANS[activePlan?.plan ?? 'free']?.label ?? 'Free'

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: `/${locale}/dashboard`, label: t('navigation.dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/creators`, label: t('navigation.creators'), icon: Users },
    { href: `/${locale}/referral`, label: t('navigation.referral'), icon: Gift },
  ]

  const user = session?.user

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href={`/${locale}/dashboard`}>
                <SidebarLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href ||
                  (href !== `/${locale}/dashboard` && pathname.startsWith(href))
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 hover:bg-sidebar-accent">
                  <div className="flex min-w-0 items-center gap-2">
                    {user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={user.name ?? 'User'}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                        {(user?.name ?? user?.email ?? 'U')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="grid flex-1 min-w-0 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">{user?.name ?? ''}</span>
                      <span className="truncate text-xs text-muted-foreground">{planLabel}</span>
                    </div>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/settings`}>
                    <Settings />
                    {t('navigation.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/settings/billing`}>
                    <CreditCard />
                    Cobrança
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}#precos`}>
                    <ArrowUpCircle />
                    Upgrade do plano
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild onSelect={e => e.preventDefault()}>
                  <div className="flex w-full items-center justify-between">
                    <span>Tema</span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut />
                  {t('navigation.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

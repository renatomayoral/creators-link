'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@repo/ui/lib/utils'
import { Cpu, Image, Library, Settings, LogOut, Link2 } from 'lucide-react'
import { authClient } from '@repo/auth/client'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Cpu },
  { href: '/studio', label: 'Studio', icon: Image },
  { href: '/creators', label: 'Criadoras', icon: Link2 },
  { href: '/library', label: 'Biblioteca', icon: Library },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-14 items-center gap-6">
          <Link href="/admin" className="font-bold text-lg text-primary">
            🎬 AI Studio
          </Link>
          <div className="flex items-center gap-1 flex-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href ||
                    (href === '/admin' && pathname.startsWith('/admin')) ||
                    (href === '/creators' && pathname.startsWith('/creators'))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* User section */}
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? 'User avatar'}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {(session.user.name ?? session.user.email ?? 'U')[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

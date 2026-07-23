import Link from 'next/link'
import { requireSession } from '@/lib/require-session'
import { LogoutButton } from './logout-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="font-semibold">
            Splitfy
          </Link>
          <Link href="/dashboard/plans" className="text-neutral-400 hover:text-white">
            Plans
          </Link>
          <Link href="/dashboard/subscriptions" className="text-neutral-400 hover:text-white">
            Subscriptions
          </Link>
          <Link href="/dashboard/settings" className="text-neutral-400 hover:text-white">
            Settings
          </Link>
          <Link href="/docs/api" className="text-neutral-400 hover:text-white">
            API docs
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span>{session.user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}

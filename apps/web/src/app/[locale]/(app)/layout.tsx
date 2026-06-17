import { Toaster } from '@repo/ui/components/toaster'
import { Providers } from '@/app/providers'
import { Navigation } from '@/components/navigation'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="container mx-auto max-w-7xl flex-1 px-4 py-6">{children}</main>
      </div>
      <Toaster />
    </Providers>
  )
}

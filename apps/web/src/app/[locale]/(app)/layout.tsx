import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { Toaster } from '@repo/ui/components/toaster'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@repo/ui/components/sidebar'
import { Separator } from '@repo/ui/components/separator'
import { Providers } from '@/app/providers'
import { AppSidebar } from '@/components/app-sidebar'
import { LocaleSync } from '@/components/locale-sync'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  let preferredLocale: string | null = null
  if (session) {
    const profile = await db.query.userProfile.findFirst({
      where: eq(schema.userProfile.userId, session.user.id),
      columns: { preferredLocale: true },
    })
    preferredLocale = profile?.preferredLocale ?? null
  }

  return (
    <Providers>
      {/* Silently redirects to preferred locale if it differs from current URL */}
      {preferredLocale && preferredLocale !== locale && (
        <LocaleSync preferredLocale={preferredLocale} currentLocale={locale} />
      )}
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </Providers>
  )
}

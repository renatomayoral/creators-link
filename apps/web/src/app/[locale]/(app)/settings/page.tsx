import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { Settings2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { LocaleSettings } from './_components/locale-settings'
import { AccountCard } from './_components/account-card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect(`/${locale}/login`)

  const profile = await db.query.userProfile.findFirst({
    where: eq(schema.userProfile.userId, session.user.id),
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Configurações</h1>

      <LocaleSettings currentLocale={(profile?.preferredLocale ?? locale) as 'br' | 'en' | 'es'} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plataformas disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-sm">
            Gerencie as plataformas disponíveis para todas as criadoras (OnlyFans, Fansly, Instagram, etc.).
          </p>
          <Link
            href={`/${locale}/creators/platforms`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            <Settings2 className="h-4 w-4" />
            Gerenciar plataformas
          </Link>
        </CardContent>
      </Card>

      <AccountCard user={session.user} />
    </div>
  )
}

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@repo/auth'
import { BillingPage as BillingPageClient } from './_components/billing-page-client'

export const dynamic = 'force-dynamic'

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Cobrança</h1>
      <BillingPageClient />
    </div>
  )
}

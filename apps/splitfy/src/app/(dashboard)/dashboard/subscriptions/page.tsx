import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/require-session'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { SubscriptionsClient } from './subscriptions-client'

export default async function SubscriptionsPage() {
  const session = await requireSession()
  const merchant = await getOwnedMerchant(session.user.id)
  if (!merchant) redirect('/dashboard/onboarding')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      <SubscriptionsClient />
    </div>
  )
}

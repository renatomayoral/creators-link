import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/require-session'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { PlansClient } from './plans-client'

export default async function PlansPage() {
  const session = await requireSession()
  const merchant = await getOwnedMerchant(session.user.id)
  if (!merchant) redirect('/dashboard/onboarding')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans</h1>
      <PlansClient />
    </div>
  )
}

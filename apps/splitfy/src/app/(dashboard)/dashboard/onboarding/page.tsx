import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/require-session'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const session = await requireSession()
  const merchant = await getOwnedMerchant(session.user.id)
  if (merchant) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your merchant</h1>
        <p className="text-neutral-400">This is the tenant that owns your plans, subscriptions, and API key.</p>
      </div>
      <OnboardingForm />
    </div>
  )
}

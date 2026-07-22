import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/require-session'
import { getOwnedMerchant } from '@/lib/owned-merchant'

export default async function DashboardHomePage() {
  const session = await requireSession()
  const merchant = await getOwnedMerchant(session.user.id)

  if (!merchant) redirect('/dashboard/onboarding')

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{merchant.name}</h1>
      <p className="text-neutral-400">
        Status: <span className="font-medium text-white">{merchant.status}</span> · Take rate:{' '}
        <span className="font-medium text-white">{merchant.takeRatePct}%</span>
      </p>
      <p className="text-sm text-neutral-500">
        API key prefix: <code>{merchant.apiKeyPrefix}…</code>
      </p>
    </div>
  )
}

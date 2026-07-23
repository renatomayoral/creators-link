import { redirect } from 'next/navigation'
import { and, eq, isNotNull } from 'drizzle-orm'
import { requireSession } from '@/lib/require-session'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { db, schema } from '@/db'

const { charge } = schema

export default async function DashboardHomePage() {
  const session = await requireSession()
  const merchant = await getOwnedMerchant(session.user.id)

  if (!merchant) redirect('/dashboard/onboarding')

  // Charges stuck after the pull leg succeeded but a later leg failed — funds
  // are sitting in the operator wallet and need manual reconciliation.
  const stuckCharges = await db.query.charge.findMany({
    where: and(eq(charge.merchantId, merchant.id), eq(charge.status, 'pulled'), isNotNull(charge.failureReason)),
  })

  return (
    <div className="space-y-6">
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

      {stuckCharges.length > 0 && (
        <section className="space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6">
          <h2 className="font-semibold text-yellow-400">Needs attention</h2>
          <p className="text-sm text-neutral-400">
            The subscriber's funds were pulled but a later transfer failed — they're sitting in the operator wallet and need
            manual reconciliation.
          </p>
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="pb-2">Charge</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {stuckCharges.map((c) => (
                <tr key={c.id} className="border-t border-neutral-800">
                  <td className="py-2 font-mono text-xs">{c.id}</td>
                  <td className="py-2">{c.grossAmount}</td>
                  <td className="py-2">{c.failureReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

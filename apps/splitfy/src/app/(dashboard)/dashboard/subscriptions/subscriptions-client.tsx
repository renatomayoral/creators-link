'use client'

import { useEffect, useState } from 'react'

type Subscription = {
  id: string
  planId: string
  subscriberWallet: string | null
  status: string
  currentPeriodEnd: string | null
  lastCharge: { status: string; createdAt: string } | null
}

export function SubscriptionsClient() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/subscriptions')
      .then((res) => res.json())
      .then((data) => setSubs(data.subscriptions ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-neutral-500">Loading…</p>
  if (subs.length === 0) return <p className="text-neutral-500">No subscriptions yet.</p>

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-neutral-500">
        <tr>
          <th className="pb-2">Subscriber</th>
          <th className="pb-2">Status</th>
          <th className="pb-2">Period end</th>
          <th className="pb-2">Last charge</th>
        </tr>
      </thead>
      <tbody>
        {subs.map((s) => (
          <tr key={s.id} className="border-t border-neutral-800">
            <td className="py-2 font-mono text-xs">{s.subscriberWallet ?? '—'}</td>
            <td className="py-2">{s.status}</td>
            <td className="py-2">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</td>
            <td className="py-2">{s.lastCharge ? s.lastCharge.status : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

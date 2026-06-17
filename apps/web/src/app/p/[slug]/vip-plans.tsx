'use client'

import { useState } from 'react'

export type PublicVipPlan = {
  id: string
  title: string
  description: string | null
  amount: number
  currency: string
  intervalDay: number
}

const intervalLabel = (d: number) =>
  d <= 31 ? 'mês' : d <= 92 ? 'trimestre' : d <= 366 ? 'ano' : `${d}d`

function price(amount: number, currency: string) {
  return (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
}

export function VipPlans({ plans, accent }: { plans: PublicVipPlan[]; accent: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (plans.length === 0) return null

  async function subscribe(planId: string) {
    setLoadingId(planId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const body = (await res.json()) as { url?: string }
      if (body.url) {
        window.location.href = body.url
        return
      }
      setLoadingId(null)
    } catch {
      setLoadingId(null)
    }
  }

  return (
    <div className="mt-7 text-left">
      <div className="mb-3 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wider" style={{ color: accent }}>
        Assinatura VIP
      </div>
      <div className="flex flex-col gap-2.5">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => subscribe(p.id)}
            disabled={loadingId !== null}
            className="flex items-center justify-between rounded-[18px] p-4 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg,rgba(236,72,153,.16),rgba(124,58,237,.16))',
              border: '1px solid rgba(236,72,153,.3)',
            }}
          >
            <div>
              <div className="text-[15.5px] font-extrabold text-white">{p.title}</div>
              {p.description && <div className="text-[12.5px]" style={{ color: '#d4b8e8' }}>{p.description}</div>}
            </div>
            <div className="text-right">
              <div className="text-[15px] font-black text-white">{price(p.amount, p.currency)}</div>
              <div className="text-[11px]" style={{ color: '#d4b8e8' }}>
                {loadingId === p.id ? 'Abrindo…' : `/${intervalLabel(p.intervalDay)}`}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

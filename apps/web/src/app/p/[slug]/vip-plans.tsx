'use client'

import { useState } from 'react'

export type PublicPlanPrice = {
  currency: string
  amountCents: number
  provider: string
}

export type PublicVipPlan = {
  id: string
  title: string
  description: string | null
  intervalDay: number
  prices: PublicPlanPrice[]
}

const intervalLabel = (d: number) =>
  d <= 31 ? 'mês' : d <= 92 ? 'trimestre' : d <= 366 ? 'ano' : `${d}d`

function formatPrice(amountCents: number, currency: string) {
  return (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  })
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: 'Cartão',
  pix_auto: 'Pix',
  pix_manual: 'Pix',
}

export function VipPlans({ plans, accent }: { plans: PublicVipPlan[]; accent: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // Selected currency per plan
  const [selectedCurrency, setSelectedCurrency] = useState<Record<string, string>>(() =>
    Object.fromEntries(plans.map(p => [p.id, p.prices[0]?.currency ?? 'brl']))
  )

  if (plans.length === 0) return null

  async function subscribe(plan: PublicVipPlan) {
    const currency = selectedCurrency[plan.id] ?? plan.prices[0]?.currency
    const price = plan.prices.find(p => p.currency === currency)
    if (!price) return

    setLoadingId(plan.id)
    try {
      if (price.provider === 'stripe') {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ planId: plan.id, currency }),
        })
        const body = await res.json()
        if (body.url) { window.location.href = body.url; return }
      } else {
        // Pix — generate QR Code
        const res = await fetch('/api/pix/charge', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ planId: plan.id, currency: 'brl', provider: price.provider }),
        })
        const body = await res.json()
        if (body.pixCopiaECola) {
          // TODO: show QR Code modal — for now copy to clipboard
          await navigator.clipboard.writeText(body.pixCopiaECola).catch(() => null)
          alert('Pix copiado! Cole no seu app de banco para pagar.')
          return
        }
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="mt-7 text-left">
      <div
        className="mb-3 flex items-center gap-2 text-[12.5px] font-bold tracking-wider uppercase"
        style={{ color: accent }}
      >
        Assinatura VIP
      </div>
      <div className="flex flex-col gap-2.5">
        {plans.map(plan => {
          const currency = selectedCurrency[plan.id] ?? plan.prices[0]?.currency ?? 'brl'
          const currentPrice = plan.prices.find(p => p.currency === currency) ?? plan.prices[0]
          const currencies = [...new Set(plan.prices.map(p => p.currency))]

          return (
            <div
              key={plan.id}
              className="rounded-[18px] p-4"
              style={{
                background: 'linear-gradient(135deg,rgba(236,72,153,.16),rgba(124,58,237,.16))',
                border: '1px solid rgba(236,72,153,.3)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15.5px] font-extrabold text-white">{plan.title}</div>
                  {plan.description && (
                    <div className="text-[12.5px]" style={{ color: '#d4b8e8' }}>{plan.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {currentPrice && (
                    <div className="text-[15px] font-black text-white">
                      {formatPrice(currentPrice.amountCents, currentPrice.currency)}
                    </div>
                  )}
                  <div className="text-[11px]" style={{ color: '#d4b8e8' }}>
                    /{intervalLabel(plan.intervalDay)}
                  </div>
                </div>
              </div>

              {/* Currency switcher */}
              {currencies.length > 1 && (
                <div className="mt-3 flex gap-1.5">
                  {currencies.map(cur => (
                    <button
                      key={cur}
                      onClick={() => setSelectedCurrency(prev => ({ ...prev, [plan.id]: cur }))}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase transition-colors',
                        currency === cur
                          ? 'bg-white/20 text-white'
                          : 'text-white/50 hover:text-white/80',
                      ].join(' ')}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => subscribe(plan)}
                disabled={loadingId !== null || !currentPrice}
                className="mt-3 w-full rounded-xl py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: accent }}
              >
                {loadingId === plan.id
                  ? 'Aguarde…'
                  : currentPrice
                  ? `Assinar via ${PROVIDER_LABELS[currentPrice.provider] ?? currentPrice.provider}`
                  : 'Indisponível'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

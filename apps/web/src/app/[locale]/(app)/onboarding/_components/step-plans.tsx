'use client'

import { useState } from 'react'
import type { OnboardingState } from './onboarding-wizard'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

type PriceRow = {
  currency: string
  amountCents: number
  provider: 'stripe' | 'stripe_crypto'
}

type PlanDraft = {
  id: string
  title: string
  description: string
  intervalDay: number
  prices: PriceRow[]
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  stripe_crypto: 'Stripe Crypto',
}

const INTERVAL_OPTIONS = [
  { value: 30, label: 'Mensal' },
  { value: 90, label: 'Trimestral' },
  { value: 365, label: 'Anual' },
]

function centsToDecimal(cents: number, currency: string) {
  return (cents / 100).toFixed(currency === 'brl' ? 2 : 2)
}

function decimalToCents(val: string) {
  return Math.round(parseFloat(val.replace(',', '.')) * 100) || 0
}

function emptyPlan(): PlanDraft {
  return { id: crypto.randomUUID(), title: '', description: '', intervalDay: 30, prices: [] }
}

export function StepPlans({ state, updateState, onNext, onBack }: Props) {
  const [plans, setPlans] = useState<PlanDraft[]>([emptyPlan()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect which payment methods the creator enabled
  const enabledPayments: string[] = (state as OnboardingState & { acceptedPayments?: string[] }).acceptedPayments ?? []
  const hasStripe = state.stripeOnboarded
  const hasStripeCrypto = enabledPayments.includes('stripe_crypto')

  function updatePlan(id: string, patch: Partial<PlanDraft>) {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function addPlan() {
    setPlans(prev => [...prev, emptyPlan()])
  }

  function removePlan(id: string) {
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  function setPrice(planId: string, currency: string, provider: string, rawValue: string) {
    const amountCents = decimalToCents(rawValue)
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      const existing = p.prices.filter(pr => !(pr.currency === currency && pr.provider === provider))
      if (amountCents > 0) {
        return { ...p, prices: [...existing, { currency, amountCents, provider: provider as PriceRow['provider'] }] }
      }
      return { ...p, prices: existing }
    }))
  }

  function getPriceValue(plan: PlanDraft, currency: string, provider: string) {
    const row = plan.prices.find(p => p.currency === currency && p.provider === provider)
    return row ? centsToDecimal(row.amountCents, currency) : ''
  }

  async function handleSave() {
    if (!state.creatorId) { onNext(); return }
    const valid = plans.filter(p => p.title.trim() && p.prices.length > 0)
    if (valid.length === 0) { onNext(); return }

    setSaving(true)
    setError(null)
    try {
      for (const plan of valid) {
        await fetch(`/api/creators/${state.creatorId}/plans`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: plan.title.trim(),
            description: plan.description.trim() || null,
            intervalDay: plan.intervalDay,
            prices: plan.prices,
          }),
        })
      }
      onNext()
    } catch {
      setError('Erro ao salvar os planos. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Planos VIP</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie os tiers de assinatura. Cada plano pode ter preços em múltiplas moedas e meios de pagamento.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {plans.map((plan, idx) => (
          <div key={plan.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                Plano {idx + 1}
              </span>
              {plans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlan(plan.id)}
                  className="text-[12px] text-red-400 hover:text-red-300"
                >
                  Remover
                </button>
              )}
            </div>

            {/* Title + interval */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold">Nome do plano <span className="text-red-400">*</span></label>
                <input
                  value={plan.title}
                  onChange={e => updatePlan(plan.id, { title: e.target.value })}
                  placeholder="VIP Basic"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold">Período</label>
                <select
                  value={plan.intervalDay}
                  onChange={e => updatePlan(plan.id, { intervalDay: Number(e.target.value) })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {INTERVAL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input
                value={plan.description}
                onChange={e => updatePlan(plan.id, { description: e.target.value })}
                placeholder="Acesso a conteúdo exclusivo + grupo VIP"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Prices by currency/provider */}
            <div className="flex flex-col gap-3">
              <p className="text-[12.5px] font-semibold">Preços</p>

              {/* Stripe USD + EUR */}
              {hasStripe && (
                <div className="rounded-xl border border-border bg-background p-3 flex flex-col gap-2">
                  <p className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider">Stripe</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['usd', 'eur'] as const).map(currency => {
                      const sym = currency === 'usd' ? 'US$' : '€'
                      return (
                        <div key={currency} className="flex flex-col gap-1">
                          <label className="text-[11.5px] text-muted-foreground">{currency.toUpperCase()}</label>
                          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                            <span className="text-[12px] text-muted-foreground">{sym}</span>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={getPriceValue(plan, currency, 'stripe')}
                              onChange={e => setPrice(plan.id, currency, 'stripe', e.target.value)}
                              placeholder="9.90"
                              className="flex-1 bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Stripe Crypto */}
              {hasStripeCrypto && (
                <div className="rounded-xl border border-border bg-background p-3 flex flex-col gap-2">
                  <p className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider">Stripe Crypto</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] text-muted-foreground">Preço em USD</label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                      <span className="text-[12px] text-muted-foreground">US$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={getPriceValue(plan, 'usd', 'stripe_crypto')}
                        onChange={e => setPrice(plan.id, 'usd', 'stripe_crypto', e.target.value)}
                        placeholder="9.90"
                        className="flex-1 bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pagamento avulso em stablecoin por período. O fã recebe um lembrete de renovação por email antes de vencer.
                  </p>
                </div>
              )}

              {!hasStripe && !hasStripeCrypto && (
                <p className="text-[12.5px] text-amber-400 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                  Nenhum meio de pagamento configurado. Volte ao passo anterior para selecionar Stripe ou Stripe Crypto.
                </p>
              )}

              {/* Price summary */}
              {plan.prices.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plan.prices.map(pr => {
                    const sym = pr.currency === 'brl' ? 'R$' : pr.currency === 'usd' ? 'US$' : '€'
                    return (
                      <span key={`${pr.currency}-${pr.provider}`} className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11.5px] font-medium text-blue-400">
                        {sym} {centsToDecimal(pr.amountCents, pr.currency)} · {PROVIDER_LABELS[pr.provider]}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addPlan}
          className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-[13px] font-medium text-muted-foreground hover:border-blue-500 hover:text-blue-400 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Adicionar plano
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onNext} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Pular por agora
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
            Salvar e continuar →
          </button>
        </div>
      </div>
    </div>
  )
}

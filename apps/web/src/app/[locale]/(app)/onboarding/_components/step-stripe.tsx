'use client'

import { useState } from 'react'
import type { OnboardingState } from './onboarding-wizard'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
}

export function StepStripe({ state, updateState, onNext }: Props) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'agency' | 'per_creator' | null>(state.stripeMode)

  async function handleContinue() {
    if (!mode) return
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/stripe-connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json()
      updateState({ stripeMode: mode })

      if (mode === 'per_creator' || data.status === 'per_creator') {
        onNext()
        return
      }
      // agency: redirect to Stripe
      if (data.url) {
        window.location.href = data.url
        return
      }
      // already onboarded
      if (data.status === 'onboarded') {
        updateState({ stripeOnboarded: true })
        onNext()
      }
    } finally {
      setLoading(false)
    }
  }

  const agencyOnboarded = state.stripeMode === 'agency' && state.stripeOnboarded

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Recebimentos via Stripe</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha como você quer receber os pagamentos das suas criadoras.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Per creator */}
        <button
          onClick={() => setMode('per_creator')}
          className={[
            'flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all',
            mode === 'per_creator'
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-border hover:border-border/60 hover:bg-accent/30',
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">👤</div>
            {mode === 'per_creator' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] text-white">✓</div>
            )}
          </div>
          <div>
            <div className="font-bold">Por criadora</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Cada criadora tem sua própria conta no Stripe. Pagamentos caem diretamente na conta de cada uma.
            </div>
          </div>
          <ul className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Pagamentos direto para a criadora</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Configurado na hora de criar cada criadora</li>
            <li className="flex items-center gap-1.5"><span className="text-muted-foreground/50">○</span> Cada criadora precisa fazer o onboarding</li>
          </ul>
        </button>

        {/* Agency */}
        <button
          onClick={() => setMode('agency')}
          className={[
            'flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all',
            mode === 'agency'
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-border hover:border-border/60 hover:bg-accent/30',
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl">🏢</div>
            {mode === 'agency' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] text-white">✓</div>
            )}
          </div>
          <div>
            <div className="font-bold">Conta da agência</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Uma conta centralizada para todas as criadoras. Você recebe tudo e faz o repasse manualmente.
            </div>
          </div>
          <ul className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Uma única conta para gerenciar</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Controle total dos recebimentos</li>
            <li className="flex items-center gap-1.5"><span className="text-muted-foreground/50">○</span> Repasse para criadoras é manual</li>
          </ul>
        </button>
      </div>

      {agencyOnboarded && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-[13.5px] font-medium text-emerald-400">
          <span>✓</span> Conta Stripe conectada com sucesso
        </div>
      )}

      {mode === 'agency' && !agencyOnboarded && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-[13px] text-muted-foreground">
          Você será redirecionado para o Stripe para completar o cadastro da sua conta.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!mode || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
          ) : null}
          {mode === 'agency' && !agencyOnboarded ? 'Conectar ao Stripe →' : 'Continuar →'}
        </button>
      </div>
    </div>
  )
}

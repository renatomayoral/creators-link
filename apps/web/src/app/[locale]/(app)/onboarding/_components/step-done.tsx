'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingState } from './onboarding-wizard'

type Props = { state: OnboardingState; locale: string }

export function StepDone({ state, locale }: Props) {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/onboarding/complete', { method: 'POST' })
  }, [])

  const items = [
    {
      done: !!state.stripeMode,
      label: 'Recebimentos configurados',
      sub: state.stripeMode === 'agency' ? 'Conta da agência no Stripe' : 'Stripe por criadora',
    },
    {
      done: state.selectedPlatforms.length > 0,
      label: 'Plataformas selecionadas',
      sub: state.selectedPlatforms.join(', ') || '—',
    },
    {
      done: !!state.creatorId,
      label: 'Primeira criadora criada',
      sub: state.creatorSlug ? `/p/${state.creatorSlug}` : '—',
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl">
        🎉
      </div>

      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Tudo configurado!</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Sua plataforma está pronta. Agora é só gerenciar suas criadoras e acompanhar os resultados.
        </p>
      </div>

      {/* Summary */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-left">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">Resumo</p>
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={[
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                item.done ? 'bg-emerald-500 text-white' : 'bg-border text-muted-foreground',
              ].join(' ')}>
                {item.done ? '✓' : '○'}
              </div>
              <div>
                <div className="text-[13.5px] font-semibold">{item.label}</div>
                <div className="text-[12px] text-muted-foreground">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {state.creatorSlug && (
          <a
            href={`/p/${state.creatorSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            Ver página pública ↗
          </a>
        )}
        <button
          onClick={() => router.push(`/${locale}/dashboard`)}
          className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Ir para o Dashboard →
        </button>
      </div>
    </div>
  )
}

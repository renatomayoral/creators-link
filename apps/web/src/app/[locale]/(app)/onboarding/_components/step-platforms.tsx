'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { OnboardingState } from './onboarding-wizard'

type Platform = { id: string; key: string; label: string; color: string; baseUrl: string }

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

export function StepPlatforms({ state, updateState, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(state.selectedPlatforms))
  const [saving, setSaving] = useState(false)

  const { data: platforms = [], isLoading } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: () => fetch('/api/platforms').then(r => r.json()),
  })

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleContinue() {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await fetch('/api/onboarding/platforms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platforms: [...selected] }),
      })
      updateState({
        selectedPlatforms: [...selected],
        hasTelegram: selected.has('telegram'),
      })
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Plataformas utilizadas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione as plataformas onde suas criadoras têm conteúdo. Você pode ajustar isso depois.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {platforms.map(p => {
            const on = selected.has(p.key)
            return (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className={[
                  'flex flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all',
                  on ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-border/60 hover:bg-accent/30',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ background: p.color }}
                  />
                  {on && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">✓</div>
                  )}
                </div>
                <span className="text-[13.5px] font-semibold">{p.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {selected.size > 0 && (
        <p className="text-[12.5px] text-muted-foreground">
          {selected.size} plataforma{selected.size > 1 ? 's' : ''} selecionada{selected.size > 1 ? 's' : ''}
          {selected.has('telegram') && ' · Telegram detectado — você poderá configurar o bot na próxima etapa'}
        </p>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <button
          onClick={handleContinue}
          disabled={selected.size === 0 || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

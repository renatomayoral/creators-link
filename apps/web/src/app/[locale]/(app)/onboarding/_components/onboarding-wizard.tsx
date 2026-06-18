'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { StepStripe } from './step-stripe'
import { StepPlatforms } from './step-platforms'
import { StepCreator } from './step-creator'
import { StepTelegram } from './step-telegram'
import { StepDomain } from './step-domain'
import { StepDone } from './step-done'

export type OnboardingState = {
  stripeMode: 'agency' | 'per_creator' | null
  stripeOnboarded: boolean
  selectedPlatforms: string[]
  creatorId: string | null
  creatorSlug: string | null
  hasTelegram: boolean
}

const STEPS = [
  { id: 1, label: 'Recebimentos', required: true },
  { id: 2, label: 'Plataformas', required: true },
  { id: 3, label: 'Criadora', required: true },
  { id: 4, label: 'Telegram', required: false },
  { id: 5, label: 'Domínio', required: false },
  { id: 6, label: 'Concluído', required: false },
]

export function OnboardingWizard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const locale = useLocale()

  const [step, setStep] = useState(() => {
    const s = parseInt(searchParams.get('step') ?? '1', 10)
    return isNaN(s) || s < 1 || s > 6 ? 1 : s
  })

  const [state, setState] = useState<OnboardingState>({
    stripeMode: null,
    stripeOnboarded: false,
    selectedPlatforms: [],
    creatorId: null,
    creatorSlug: null,
    hasTelegram: false,
  })

  // sync step into URL without navigation
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('step', String(step))
    window.history.replaceState(null, '', url.toString())
  }, [step])

  // check if returning from Stripe Connect
  useEffect(() => {
    const connect = searchParams.get('connect')
    if (connect === 'return') {
      fetch('/api/onboarding/stripe-connect')
        .then(r => r.json())
        .then(data => {
          if (data.onboarded) {
            setState(s => ({ ...s, stripeOnboarded: true }))
          }
        })
    }
  }, [])

  function goNext() {
    setStep(s => {
      const next = s + 1
      // skip Telegram step if user didn't select it
      if (next === 4 && !state.hasTelegram) return 5
      return next > 6 ? 6 : next
    })
  }

  function goBack() {
    setStep(s => {
      const prev = s - 1
      // skip Telegram step going back if user didn't select it
      if (prev === 4 && !state.hasTelegram) return 3
      return prev < 1 ? 1 : prev
    })
  }

  function updateState(patch: Partial<OnboardingState>) {
    setState(s => ({ ...s, ...patch }))
  }

  const visibleSteps = state.hasTelegram ? STEPS : STEPS.filter(s => s.id !== 4)

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-5xl gap-8 py-8">
      {/* Sidebar stepper */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-24">
          <p className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Configuração
          </p>
          <ol className="flex flex-col gap-1">
            {visibleSteps.map((s, i) => {
              const displayStep = i + 1
              const done = step > (state.hasTelegram ? s.id : s.id >= 4 ? s.id + 1 : s.id)
              const current = step === s.id || (!state.hasTelegram && step === 5 && s.id === 5)
              return (
                <li key={s.id} className="flex items-center gap-3 py-1.5">
                  <div className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors',
                    done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-border text-muted-foreground',
                  ].join(' ')}>
                    {done ? '✓' : displayStep}
                  </div>
                  <span className={[
                    'text-[13.5px] font-medium transition-colors',
                    current ? 'text-foreground' : 'text-muted-foreground',
                  ].join(' ')}>
                    {s.label}
                    {!s.required && <span className="ml-1 text-[10px] opacity-60">opcional</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </aside>

      {/* Step content */}
      <main className="flex-1">
        {/* Mobile step indicator */}
        <div className="mb-6 flex items-center gap-2 lg:hidden">
          {visibleSteps.map((s, i) => (
            <div
              key={s.id}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors',
                step > s.id ? 'bg-emerald-500' : step === s.id ? 'bg-blue-500' : 'bg-border',
              ].join(' ')}
            />
          ))}
        </div>

        {step === 1 && (
          <StepStripe state={state} updateState={updateState} onNext={goNext} />
        )}
        {step === 2 && (
          <StepPlatforms state={state} updateState={updateState} onNext={goNext} onBack={goBack} />
        )}
        {step === 3 && (
          <StepCreator state={state} updateState={updateState} onNext={goNext} onBack={goBack} />
        )}
        {step === 4 && state.hasTelegram && (
          <StepTelegram state={state} updateState={updateState} onNext={goNext} onBack={goBack} />
        )}
        {step === 5 && (
          <StepDomain state={state} updateState={updateState} onNext={goNext} onBack={goBack} />
        )}
        {step === 6 && (
          <StepDone state={state} locale={locale} />
        )}
      </main>
    </div>
  )
}

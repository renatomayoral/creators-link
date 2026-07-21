'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { DateRangePicker } from './_components/date-range-picker'
import { KpiRow } from './_components/kpi-row'
import { RevenueChart } from './_components/revenue-chart'
import { Breakdown } from './_components/breakdown'
import { SourcesTable } from './_components/sources-table'
import { WithdrawCard } from './_components/withdraw-card'
import { TransactionsTable } from './_components/transactions-table'
import { compute } from './_components/dashboard'
import type { DateRange, LedgerRow } from './_components/dashboard'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultRange(): DateRange {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29) // last 30 days, inclusive
  return { start: toISO(start), end: toISO(end) }
}

type OnboardingStatus = { onboardingStep: number; selectedPlatforms: string[]; stripeMode: string | null; stripeOnboarded: boolean }

export default function AdminPage() {
  const locale = useLocale()
  const [range, setRange] = useState<DateRange>(defaultRange)

  const { data: onboarding } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status'],
    queryFn: () => fetch('/api/onboarding/status').then(r => r.json()),
  })

  const { data: rows = [] } = useQuery<LedgerRow[]>({
    queryKey: ['dashboard-transactions', range.start, range.end],
    queryFn: () =>
      fetch(`/api/dashboard/transactions?start=${range.start}&end=${range.end}`).then(r => r.json()),
  })

  const showBanner = onboarding && onboarding.onboardingStep < 4

  const data = compute(rows)

  const handleExport = useCallback(() => {
    const headers = ['ID', 'Data', 'Criadora', 'Fonte', 'Bruto', 'Taxa Plataforma', 'Taxa Cambial', 'Líquido']
    const csvRows = rows.map(t => {
      const pf = t.gross * t.pf, fx = t.gross * t.fx
      return [t.id, t.date, t.creator, t.source, t.gross.toFixed(2), pf.toFixed(2), fx.toFixed(2), (t.gross - pf - fx).toFixed(2)]
    })
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `financeiro-${range.start}-${range.end}.csv`
    a.click()
  }, [rows, range])

  const STEPS = [
    { label: 'Stripe configurado', done: !!onboarding?.stripeMode },
    { label: 'Plataformas selecionadas', done: (onboarding?.selectedPlatforms?.length ?? 0) > 0 },
    { label: 'Primeira criadora criada', done: (onboarding?.onboardingStep ?? 0) >= 3 },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Onboarding banner */}
      {showBanner && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 px-5 py-4">
          <div>
            <p className="text-[13.5px] font-bold">Complete a configuração da plataforma</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {STEPS.map(s => (
                <span key={s.label} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <span className={s.done ? 'text-emerald-400' : 'text-muted-foreground/40'}>
                    {s.done ? '✓' : '○'}
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <Link
            href={`/${locale}/onboarding`}
            className="shrink-0 rounded-xl bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
          >
            Continuar setup →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo que você faturou, com cada taxa discriminada — pronto para o contador.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <DateRangePicker range={range} onChange={setRange} />
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <KpiRow data={data} />

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <RevenueChart chart={data.chart} days={data.chartDays} />
        <Breakdown data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <SourcesTable sources={data.sources} />
        <WithdrawCard />
      </div>

      <TransactionsTable rows={rows} count={data.count} />

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Valores refletem o processado pelo Stripe na sua conta conectada · relatório pronto para contabilidade.
      </p>
    </div>
  )
}

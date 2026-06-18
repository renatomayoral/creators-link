'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { DateRangePicker } from '../financeiro/_components/date-range-picker'
import { KpiRow } from '../financeiro/_components/kpi-row'
import { RevenueChart } from '../financeiro/_components/revenue-chart'
import { Breakdown } from '../financeiro/_components/breakdown'
import { SourcesTable } from '../financeiro/_components/sources-table'
import { WithdrawCard } from '../financeiro/_components/withdraw-card'
import { TransactionsTable } from '../financeiro/_components/transactions-table'
import { compute } from '../financeiro/_components/financeiro-dashboard'
import type { DateRange, LedgerRow } from '../financeiro/_components/financeiro-dashboard'

const LEDGER: LedgerRow[] = [
  { id: 'TX-9412', date: '2026-06-17', creator: 'Babi Barelli',  source: 'OnlyFans',                sc: '#ec4899', gross: 100.00, pf: 0.039, fx: 0.02 },
  { id: 'TX-9410', date: '2026-06-16', creator: 'Babi Barelli',  source: 'Telegram · Plano VIP',    sc: '#38bdf8', gross:  49.90, pf: 0.029, fx: 0.02, tg: true },
  { id: 'TX-9405', date: '2026-06-15', creator: 'Lara Veloso',   source: 'Privacy',                 sc: '#ff5a5f', gross:  75.00, pf: 0.042, fx: 0.02 },
  { id: 'TX-9399', date: '2026-06-14', creator: 'Mia Castro',    source: 'OnlyFans',                sc: '#ec4899', gross: 120.00, pf: 0.039, fx: 0.02 },
  { id: 'TX-9388', date: '2026-06-12', creator: 'Babi Barelli',  source: 'Telegram · Plano Mensal', sc: '#38bdf8', gross:  29.90, pf: 0.029, fx: 0.02, tg: true },
  { id: 'TX-9377', date: '2026-06-10', creator: 'Lara Veloso',   source: 'Fanvue',                  sc: '#6d5dfc', gross:  60.00, pf: 0.045, fx: 0.02 },
  { id: 'TX-9361', date: '2026-06-08', creator: 'Mia Castro',    source: 'OnlyFans',                sc: '#ec4899', gross: 200.00, pf: 0.039, fx: 0.02 },
  { id: 'TX-9344', date: '2026-06-05', creator: 'Babi Barelli',  source: 'OnlyFans',                sc: '#ec4899', gross: 100.00, pf: 0.039, fx: 0.02 },
  { id: 'TX-9320', date: '2026-06-02', creator: 'Lara Veloso',   source: 'Telegram · Plano VIP',    sc: '#38bdf8', gross:  49.90, pf: 0.029, fx: 0.02, tg: true },
  { id: 'TX-9301', date: '2026-05-29', creator: 'Mia Castro',    source: 'Privacy',                 sc: '#ff5a5f', gross:  90.00, pf: 0.042, fx: 0.02 },
  { id: 'TX-9288', date: '2026-05-25', creator: 'Babi Barelli',  source: 'OnlyFans',                sc: '#ec4899', gross: 150.00, pf: 0.039, fx: 0.02 },
  { id: 'TX-9270', date: '2026-05-21', creator: 'Lara Veloso',   source: 'OnlyFans',                sc: '#ec4899', gross:  80.00, pf: 0.039, fx: 0.02 },
]

function parseISO(d: string) {
  const p = d.split('-').map(Number)
  return new Date(p[0]!, p[1]! - 1, p[2]!)
}

type OnboardingStatus = { onboardingStep: number; selectedPlatforms: string[]; stripeMode: string | null; stripeOnboarded: boolean }

export default function AdminPage() {
  const locale = useLocale()
  const [range, setRange] = useState<DateRange>({ start: '2026-05-18', end: '2026-06-17' })

  const { data: onboarding } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status'],
    queryFn: () => fetch('/api/onboarding/status').then(r => r.json()),
  })

  const showBanner = onboarding && onboarding.onboardingStep < 4

  const rows = LEDGER.filter(t => {
    const ts = parseISO(t.date).getTime()
    return ts >= parseISO(range.start).getTime() && ts <= parseISO(range.end).getTime()
  })
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
    { label: 'Plataformas selecionadas', done: (onboarding?.selectedPlatforms.length ?? 0) > 0 },
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
        <WithdrawCard available={data.available} />
      </div>

      <TransactionsTable rows={rows} count={data.count} />

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Valores em USD convertidos para BRL no câmbio da liquidação. Taxas de IOF e Swift discriminadas conforme legislação vigente · relatório pronto para contabilidade.
      </p>
    </div>
  )
}

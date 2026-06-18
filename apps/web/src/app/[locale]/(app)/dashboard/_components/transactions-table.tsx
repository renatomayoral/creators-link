'use client'

import { useState } from 'react'
import { money } from './dashboard'
import type { LedgerRow } from './dashboard'

type Props = { rows: LedgerRow[]; count: number }

function parseISO(d: string) {
  const parts = d.split('-').map(Number)
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
}

function fmtDate(d: string) {
  const dt = parseISO(d)
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${String(dt.getDate()).padStart(2,'0')} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

export function TransactionsTable({ rows, count }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-[18px] border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-[15px] font-bold">Transações</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{count} {count === 1 ? 'transação' : 'transações'} no período selecionado</div>
        </div>
        <div className="flex gap-3 text-[11.5px] text-muted-foreground">
          <span>Clique em uma linha para ver taxas</span>
        </div>
      </div>

      {/* Table head */}
      <div className="grid grid-cols-[1fr_1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_32px] items-center gap-3 border-b border-border px-5 py-2">
        {['ID','Data','Criadora','Fonte','Bruto','Taxa Plat.','Taxa FX','Líquido'].map((h, i) => (
          <div key={i} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</div>
        ))}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma transação no período selecionado.</div>
      ) : (
        rows.map(t => {
          const pf = t.gross * t.pf
          const fx = t.gross * t.fx
          const net = t.gross - pf - fx
          const open = expanded.has(t.id)

          return (
            <div key={t.id} className="border-b border-border last:border-none">
              <button
                onClick={() => toggle(t.id)}
                className="grid w-full grid-cols-[1fr_1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_32px] cursor-pointer items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/30"
              >
                <span className="font-mono text-[12.5px] text-muted-foreground">{t.id}</span>
                <span className="text-[13px]">{fmtDate(t.date)}</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-bold uppercase text-foreground">
                    {t.creator.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-[13px] font-medium">{t.creator}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] shrink-0" style={{ background: t.sc }} />
                  <span className="truncate text-[12.5px]">{t.source.startsWith('Telegram') ? 'Telegram' : t.source}</span>
                </div>
                <span className="text-[13px] font-semibold">{money(t.gross)}</span>
                <span className="text-[13px] text-red-400">−{money(pf)}</span>
                <span className="text-[13px] text-amber-400">−{money(fx)}</span>
                <span className="text-[13.5px] font-bold text-emerald-400">{money(net)}</span>
                <svg
                  viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`ml-auto shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {open && (
                <div className="grid grid-cols-3 gap-3 border-t border-border bg-accent/20 px-5 py-4 sm:grid-cols-5">
                  <FeeDetail label="Valor bruto" value={money(t.gross)} color="text-foreground" />
                  <FeeDetail label={`Taxa plataforma (${(t.pf * 100).toFixed(1)}%)`} value={`−${money(pf)}`} color="text-red-400" />
                  <FeeDetail label="Taxa cambial (2,0%)" value={`−${money(fx)}`} color="text-amber-400" />
                  <FeeDetail label="Líquido" value={money(net)} color="text-emerald-400 font-bold" />
                  <div className="col-span-3 sm:col-span-1">
                    <div className="text-[11px] font-semibold text-muted-foreground">Fonte completa</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px]">
                      <span className="h-2.5 w-2.5 rounded-[2px] shrink-0" style={{ background: t.sc }} />
                      {t.source}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function FeeDetail({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[13.5px] ${color}`}>{value}</div>
    </div>
  )
}

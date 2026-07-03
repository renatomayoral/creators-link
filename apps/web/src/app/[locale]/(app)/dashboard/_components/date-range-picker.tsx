'use client'

import { useState, useEffect, useRef } from 'react'
import type { DateRange } from './dashboard'
import { fmtFull } from './dashboard'

type Props = { range: DateRange; onChange: (r: DateRange) => void }

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const TODAY = todayISO()
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DOW_LABELS = ['D','S','T','Q','Q','S','S']

function parseISO(d: string) {
  const p = d.split('-').map(Number)
  return new Date(p[0]!, p[1]! - 1, p[2]!)
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface MonthGridProps {
  year: number
  month: number
  start: string | null
  end: string | null
  onPick: (iso: string) => void
}

function MonthGrid({ year, month, start, end, onPick }: MonthGridProps) {
  const todayT = parseISO(TODAY).getTime()
  const startT = start ? parseISO(start).getTime() : null
  const endT = end ? parseISO(end).getTime() : null

  const firstDow = getFirstDayOfWeek(year, month)
  const daysInMonth = getDaysInMonth(year, month)

  const blanks = Array.from({ length: firstDow }, (_, i) => i)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div style={{ width: 224 }}>
      {/* Month label */}
      <div className="mb-2 text-center text-[13px] font-bold text-foreground">
        {MONTH_NAMES[month]} {year}
      </div>

      {/* Day of week header */}
      <div className="mb-1 grid grid-cols-7">
        {DOW_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex h-8 w-8 items-center justify-center text-[11px] font-semibold text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {blanks.map(i => (
          <div key={`b${i}`} className="h-8 w-8" />
        ))}
        {days.map(day => {
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const t = parseISO(iso).getTime()
          const isFuture = t > todayT
          const isStart = startT !== null && t === startT
          const isEnd = endT !== null && t === endT
          const isBetween = startT !== null && endT !== null && t > startT && t < endT
          const isToday = iso === TODAY

          let cellClass = 'flex h-8 w-8 items-center justify-center text-[12.5px] font-medium transition-colors rounded-lg '

          if (isStart || isEnd) {
            cellClass += 'bg-blue-500 text-white font-bold '
          } else if (isBetween) {
            cellClass += 'bg-blue-500/15 text-foreground rounded-none '
          } else if (isFuture) {
            cellClass += 'text-muted-foreground/30 cursor-not-allowed '
          } else {
            cellClass += 'hover:bg-accent cursor-pointer '
            if (isToday) cellClass += 'ring-1 ring-inset ring-blue-500 '
          }

          return (
            <div key={day} className="flex h-8 w-8 items-center justify-center">
              <button
                disabled={isFuture}
                onClick={() => !isFuture && onPick(iso)}
                className={cellClass}
                style={{ width: 30, height: 30 }}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({ range, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const initialMonth = parseISO(range.end)
  const [rightYear, setRightYear] = useState(initialMonth.getFullYear())
  const [rightMonth, setRightMonth] = useState(initialMonth.getMonth())
  const [picking, setPicking] = useState<{ start: string | null; end: string | null }>({
    start: range.start,
    end: range.end,
  })
  const ref = useRef<HTMLDivElement>(null)

  // Left calendar = one month before right
  const leftMonth = rightMonth === 0 ? 11 : rightMonth - 1
  const leftYear = rightMonth === 0 ? rightYear - 1 : rightYear

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function navMonth(dir: number) {
    let m = rightMonth + dir
    let y = rightYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setRightMonth(m)
    setRightYear(y)
  }

  function handlePick(iso: string) {
    const { start, end } = picking
    // If nothing selected or both already selected, start fresh
    if (!start || (start && end)) {
      setPicking({ start: iso, end: null })
      return
    }
    // If clicked before start, restart
    if (parseISO(iso).getTime() < parseISO(start).getTime()) {
      setPicking({ start: iso, end: null })
      return
    }
    setPicking({ start, end: iso })
  }

  function applyPreset(days: number) {
    const endDate = parseISO(TODAY)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)
    const s = toISO(startDate)
    const e = toISO(endDate)
    setPicking({ start: s, end: e })
    // Navigate calendar to show the start month on left
    const sm = startDate.getMonth()
    const sy = startDate.getFullYear()
    // right calendar = month after start
    let rm = sm + 1, ry = sy
    if (rm > 11) { rm = 0; ry++ }
    setRightMonth(rm)
    setRightYear(ry)
  }

  function apply() {
    if (picking.start && picking.end) {
      onChange({ start: picking.start, end: picking.end })
    }
    setOpen(false)
  }

  const label = `${fmtFull(parseISO(range.start))} – ${fmtFull(parseISO(range.end))}`

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-accent"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{label}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="flex w-36 flex-col gap-1 border-r border-border p-3">
              <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Atalhos
              </div>
              {[
                { label: 'Hoje', days: 1 },
                { label: 'Últimos 7 dias', days: 7 },
                { label: 'Últimos 30 dias', days: 30 },
                { label: 'Últimos 90 dias', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => applyPreset(days)}
                  className="rounded-lg px-2 py-2 text-left text-[12.5px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={apply}
                disabled={!picking.start || !picking.end}
                className="mt-2 rounded-lg bg-blue-500 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>

            {/* Calendar area */}
            <div className="p-4">
              {/* Nav row */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => navMonth(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
                >
                  ‹
                </button>
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {MONTH_NAMES[leftMonth]} – {MONTH_NAMES[rightMonth]} {rightYear}
                </span>
                <button
                  onClick={() => navMonth(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
                >
                  ›
                </button>
              </div>

              {/* Two month grids side by side */}
              <div className="flex gap-6">
                <MonthGrid
                  year={leftYear}
                  month={leftMonth}
                  start={picking.start}
                  end={picking.end}
                  onPick={handlePick}
                />
                <MonthGrid
                  year={rightYear}
                  month={rightMonth}
                  start={picking.start}
                  end={picking.end}
                  onPick={handlePick}
                />
              </div>

              {/* Selection hint */}
              {picking.start && !picking.end && (
                <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
                  Agora selecione a data final
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type DateRange = { start: string; end: string }

export type LedgerRow = {
  id: string
  date: string
  creator: string
  source: string
  sc: string
  gross: number
  pf: number
  fx: number
  tg?: boolean
}

function parseISO(d: string) {
  const p = d.split('-').map(Number)
  return new Date(p[0]!, p[1]! - 1, p[2]!)
}

export function money(n: number) {
  return '$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtBR(d: Date) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}

export function fmtFull(d: Date) {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function compute(rows: LedgerRow[]) {
  let gross = 0, pf = 0, fx = 0
  for (const t of rows) { gross += t.gross; pf += t.gross * t.pf; fx += t.gross * t.fx }
  const net = gross - pf - fx
  const count = rows.length

  const byDay: Record<string, { net: number; fee: number }> = {}
  for (const t of rows) {
    const fee = t.gross * t.pf + t.gross * t.fx
    byDay[t.date] ??= { net: 0, fee: 0 }
    byDay[t.date]!.net += t.gross - fee
    byDay[t.date]!.fee += fee
  }
  const days = Object.keys(byDay).sort()
  const maxTotal = Math.max(1, ...days.map(d => (byDay[d]?.net ?? 0) + (byDay[d]?.fee ?? 0)))
  const chart = days.map(d => ({
    netH: Math.round((byDay[d]?.net ?? 0) / maxTotal * 100),
    feeH: Math.round((byDay[d]?.fee ?? 0) / maxTotal * 100),
    title: fmtBR(parseISO(d)) + ' · líq ' + money(byDay[d]?.net ?? 0),
  }))

  const srcMap: Record<string, { name: string; color: string; gross: number; net: number; tg: boolean }> = {}
  for (const t of rows) {
    const key = t.source.startsWith('Telegram') ? 'Telegram (Planos)' : t.source
    const color = t.source.startsWith('Telegram') ? '#38bdf8' : t.sc
    const fee = t.gross * t.pf + t.gross * t.fx
    srcMap[key] ??= { name: key, color, gross: 0, net: 0, tg: !!t.tg }
    srcMap[key]!.gross += t.gross
    srcMap[key]!.net += t.gross - fee
  }
  const srcArr = Object.values(srcMap).sort((a, b) => b.gross - a.gross)
  const maxSrc = Math.max(1, ...srcArr.map(s => s.gross))
  const sources = srcArr.map(s => ({
    ...s,
    grossFmt: money(s.gross),
    netFmt: money(s.net),
    barPct: Math.round(s.gross / maxSrc * 100),
  }))

  return {
    gross, pf, fx, net, count,
    available: net * 0.62,
    pending: net * 0.18,
    avg: gross / Math.max(1, count),
    chart,
    chartDays: days,
    sources,
  }
}

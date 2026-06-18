import { fmtBR } from './dashboard'

type ChartBar = { netH: number; feeH: number; title: string }
type Props = { chart: ChartBar[]; days: string[] }

function parseISO(d: string) {
  const parts = d.split('-').map(Number)
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
}

export function RevenueChart({ chart, days }: Props) {
  const start = days[0] ? fmtBR(parseISO(days[0]!)) : ''
  const midDay = days[Math.floor(days.length / 2)]
  const mid = midDay ? fmtBR(parseISO(midDay)) : ''
  const lastDay = days[days.length - 1]
  const end = lastDay ? fmtBR(parseISO(lastDay)) : ''

  return (
    <div className="rounded-[18px] border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-bold">Receita no período</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">Bruto vs. líquido por dia</div>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1e3a5f]" />Taxas
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />Líquido
          </span>
        </div>
      </div>

      <div className="flex h-[200px] items-end gap-1 border-b border-border pb-px">
        {chart.length === 0 ? (
          <div className="flex w-full items-center justify-center text-sm text-muted-foreground">
            Nenhuma transação no período
          </div>
        ) : (
          chart.map((d, i) => (
            <div
              key={i}
              title={d.title}
              className="flex flex-1 cursor-default flex-col justify-end overflow-hidden rounded-t-[3px]"
              style={{ height: '100%' }}
            >
              <div style={{ height: `${d.feeH}%`, background: '#1e3a5f' }} />
              <div style={{ height: `${d.netH}%`, background: 'linear-gradient(180deg,#60a5fa,#3b82f6)' }} />
            </div>
          ))
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{start}</span>
        <span>{mid}</span>
        <span>{end}</span>
      </div>
    </div>
  )
}

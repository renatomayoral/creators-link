import { compute } from './dashboard'

type Source = ReturnType<typeof compute>['sources'][number]
type Props = { sources: Source[] }

export function SourcesTable({ sources }: Props) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[15px] font-bold">Receita por fonte</div>
        <div className="mt-0.5 text-[12.5px] text-muted-foreground">Faturamento bruto e líquido por plataforma</div>
      </div>

      <div className="flex flex-col gap-4">
        {sources.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação no período</div>
        ) : sources.map(s => (
          <div key={s.name}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-[3px]" style={{ background: s.color }} />
                <span className="text-[13.5px] font-semibold">{s.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[13.5px] font-bold">{s.grossFmt}</span>
                <span className="ml-2 text-[11.5px] text-muted-foreground">líq {s.netFmt}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${s.barPct}%`, background: s.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { money, compute } from './dashboard'
import type { StripeBalanceResponse } from '@/app/api/dashboard/stripe-balance/route'

type Props = { data: ReturnType<typeof compute> }

export function KpiRow({ data }: Props) {
  const { gross, net, avg, count } = data
  const netMargin = gross > 0 ? (net / gross * 100).toFixed(1).replace('.', ',') + '%' : '0%'

  const { data: balance } = useQuery<StripeBalanceResponse>({
    queryKey: ['dashboard-stripe-balance'],
    queryFn: () => fetch('/api/dashboard/stripe-balance').then(r => r.json()),
  })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-card p-4">
        <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted-foreground">Saldo disponível</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
        </div>
        <div className="mt-2.5 text-2xl font-extrabold text-emerald-400">{money(balance?.available ?? 0)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">Pronto para saque</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted-foreground">Em processamento</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div className="mt-2.5 text-2xl font-extrabold">{money(balance?.pending ?? 0)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">Libera em até 7 dias</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted-foreground">Faturamento bruto</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div className="mt-2.5 text-2xl font-extrabold">{money(gross)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">no período selecionado</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted-foreground">Líquido recebido</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div className="mt-2.5 text-2xl font-extrabold">{money(net)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{netMargin} do bruto</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted-foreground">Ticket médio</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-3-3-4 4"/></svg>
        </div>
        <div className="mt-2.5 text-2xl font-extrabold">{money(avg)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{count} vendas</div>
      </div>
    </div>
  )
}

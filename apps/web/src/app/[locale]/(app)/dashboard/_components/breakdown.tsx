import { money, compute } from './dashboard'

type Props = { data: ReturnType<typeof compute> }

export function Breakdown({ data }: Props) {
  const { gross, pf, fx, net, count } = data
  const netMargin = gross > 0 ? (net / gross * 100).toFixed(1).replace('.', ',') + '%' : '0%'
  const pfPct = gross > 0 ? (pf / gross * 100).toFixed(1).replace('.', ',') + '%' : '0%'
  const fxPct = gross > 0 ? (fx / gross * 100).toFixed(1).replace('.', ',') + '%' : '0%'

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[15px] font-bold">Discriminação do período</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-emerald-400">
          100% TRANSPARENTE
        </span>
      </div>
      <div className="mb-4 text-[12.5px] text-muted-foreground">Cada centavo, da venda ao seu bolso.</div>

      <div className="flex flex-col gap-0.5">
        {/* Valor bruto */}
        <Row
          icon={<DollarIcon stroke="#f8fafc" />}
          iconBg="rgba(248,250,252,.06)"
          title="Valor bruto"
          sub={`${count} vendas no período`}
          value={money(gross)}
          valueClass="text-[16px] font-extrabold"
        />
        <Divider />

        {/* Taxa plataforma */}
        <Row
          icon={<CardIcon stroke="#f87171" />}
          iconBg="rgba(248,113,113,.1)"
          title="Taxa de plataforma / Stripe"
          sub={`${pfPct} sobre o bruto`}
          value={`−${money(pf)}`}
          valueClass="text-[16px] font-bold text-red-400"
        />
        <Divider />

        {/* Câmbio */}
        <Row
          icon={<GlobeIcon stroke="#fbbf24" />}
          iconBg="rgba(251,191,36,.1)"
          title="Conversão cambial"
          sub={`Swift / IOF · ${fxPct}`}
          value={`−${money(fx)}`}
          valueClass="text-[16px] font-bold text-amber-400"
        />

        <div className="my-1 h-[2px] bg-border" />

        {/* Líquido */}
        <div className="mt-0.5 flex items-center justify-between rounded-xl border border-emerald-400/22 bg-emerald-400/8 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-emerald-400/16">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div>
              <div className="text-[13.5px] font-bold text-emerald-400">Líquido para você</div>
              <div className="text-[11.5px] text-muted-foreground">{netMargin} do faturamento</div>
            </div>
          </div>
          <span className="text-[19px] font-black text-emerald-400">{money(net)}</span>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, iconBg, title, sub, value, valueClass }: {
  icon: React.ReactNode; iconBg: string
  title: string; sub: string; value: string; valueClass: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px]" style={{ background: iconBg }}>
          {icon}
        </div>
        <div>
          <div className="text-[13.5px] font-semibold">{title}</div>
          <div className="text-[11.5px] text-muted-foreground">{sub}</div>
        </div>
      </div>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

function Divider() { return <div className="h-px bg-border" /> }

function DollarIcon({ stroke }: { stroke: string }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function CardIcon({ stroke }: { stroke: string }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}
function GlobeIcon({ stroke }: { stroke: string }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/><circle cx="12" cy="12" r="10"/></svg>
}

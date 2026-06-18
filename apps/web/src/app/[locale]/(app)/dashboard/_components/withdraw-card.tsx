'use client'

import { money } from './dashboard'

type Props = { available: number }

// Simulates what would come from Stripe Connect API (account status + next payout)
const MOCK_CONNECT = {
  onboarded: true,
  country: 'BR',
  currency: 'BRL',
  nextPayoutDate: '2026-06-20',
  nextPayoutAmount: null as number | null, // null = Stripe hasn't scheduled yet
  payoutsEnabled: true,
  bankLast4: '4242',
  bankName: 'Itaú Unibanco',
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${String(Number(d)).padStart(2,'0')} ${months[Number(m)! - 1]} ${y}`
}

export function WithdrawCard({ available }: Props) {
  const { onboarded, payoutsEnabled, bankLast4, bankName, nextPayoutDate, country, currency } = MOCK_CONNECT

  if (!onboarded) {
    return (
      <div className="flex flex-col rounded-[18px] border border-amber-500/25 bg-card p-5">
        <div className="mb-1 text-[15px] font-bold">Recebimentos</div>
        <div className="mb-5 text-[12.5px] text-muted-foreground">Configure sua conta para receber via Stripe.</div>

        <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-400/8 p-4">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div className="text-[12.5px] text-muted-foreground">
            Complete o onboarding do Stripe para ativar os pagamentos automáticos direto na sua conta bancária.
          </div>
        </div>

        <button className="mt-auto flex items-center justify-center gap-2.5 rounded-xl bg-[#635BFF] py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90">
          <StripeLogo />
          Conectar ao Stripe
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[15px] font-bold">Recebimentos</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-emerald-400">
          AUTOMÁTICO
        </span>
      </div>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        O dinheiro cai direto na sua conta — sem precisar sacar.
      </div>

      {/* Como funciona */}
      <div className="mb-4 rounded-xl border border-border bg-background/50 p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Como funciona</div>
        <div className="flex flex-col gap-2">
          <Step n="1" text="Creator assina ou faz pagamento" />
          <Step n="2" text="Stripe processa e desconta taxas" />
          <Step n="3" text="Saldo depositado automaticamente na sua conta" />
        </div>
      </div>

      {/* Conta bancária */}
      <div className="mb-1 text-[12px] font-semibold text-muted-foreground">Conta cadastrada no Stripe</div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M7 8V6a5 5 0 0 1 10 0v2"/></svg>
        <span className="text-[13px] font-medium">{bankName}</span>
        <span className="text-[12px] text-muted-foreground">····{bankLast4}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10.5px] font-bold text-muted-foreground">{country} · {currency}</span>
        </div>
      </div>

      {/* Próximo payout */}
      <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-blue-500/8 px-3 py-2 text-[12px] text-muted-foreground">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Próximo depósito automático: <strong className="ml-1 text-foreground">{fmtDate(nextPayoutDate)}</strong>
      </div>

      {/* Saldo acumulado */}
      <div className="mt-auto rounded-xl bg-accent/40 p-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Acumulado no período</div>
        <div className="text-[22px] font-black text-foreground">{money(available)}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">Será depositado no próximo ciclo do Stripe</div>
      </div>

      <a
        href="https://dashboard.stripe.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <StripeLogo size={14} />
        Ver no Stripe Dashboard
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  )
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-black text-blue-400">{n}</span>
      <span className="text-[12.5px] text-muted-foreground">{text}</span>
    </div>
  )
}

function StripeLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  )
}

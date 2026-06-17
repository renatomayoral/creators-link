export type VipPlan = {
  id: string
  title: string
  description: string | null
  amount: number
  currency: string
  intervalDay: number
  active: boolean
}

// Covers all subscription models used in the creator economy market:
// flash (Telegram), biweekly, monthly (OnlyFans/Privacy standard),
// quarterly, semi-annual, annual, and lifetime (one-time).
export const INTERVAL_OPTIONS = [
  { value: '7', label: 'Semanal', sublabel: '7 dias' },
  { value: '14', label: 'Quinzenal', sublabel: '14 dias' },
  { value: '30', label: 'Mensal', sublabel: '30 dias' },
  { value: '90', label: 'Trimestral', sublabel: '3 meses' },
  { value: '180', label: 'Semestral', sublabel: '6 meses' },
  { value: '365', label: 'Anual', sublabel: '12 meses' },
  { value: '36500', label: 'Vitalício', sublabel: 'pagamento único' },
] as const

export const CURRENCY_OPTIONS = [
  { value: 'brl', label: 'BRL (R$)' },
  { value: 'usd', label: 'USD ($)' },
  { value: 'eur', label: 'EUR (€)' },
] as const

export function fmtPrice(amount: number, currency: string) {
  return (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
}

export function intervalLabel(days: number) {
  const opt = INTERVAL_OPTIONS.find((o) => o.value === String(days))
  return opt ? opt.label : `${days}d`
}

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
  { value: '7', labelKey: 'creators.intervals.weekly', sublabelKey: 'creators.intervals.weeklySub' },
  { value: '14', labelKey: 'creators.intervals.biweekly', sublabelKey: 'creators.intervals.biweeklySub' },
  { value: '30', labelKey: 'creators.intervals.monthly', sublabelKey: 'creators.intervals.monthlySub' },
  { value: '90', labelKey: 'creators.intervals.quarterly', sublabelKey: 'creators.intervals.quarterlySub' },
  { value: '180', labelKey: 'creators.intervals.semiAnnual', sublabelKey: 'creators.intervals.semiAnnualSub' },
  { value: '365', labelKey: 'creators.intervals.annual', sublabelKey: 'creators.intervals.annualSub' },
  { value: '36500', labelKey: 'creators.intervals.lifetime', sublabelKey: 'creators.intervals.lifetimeSub' },
] as const

export const CURRENCY_OPTIONS = [
  { value: 'brl', label: 'BRL (R$)' },
  { value: 'usd', label: 'USD ($)' },
  { value: 'eur', label: 'EUR (€)' },
] as const

export function fmtPrice(amount: number, currency: string, locale: string = 'pt-BR') {
  return (amount / 100).toLocaleString(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
}

export function intervalLabel(days: number, t: (key: string) => string) {
  const opt = INTERVAL_OPTIONS.find((o) => o.value === String(days))
  return opt ? t(opt.labelKey) : `${days}d`
}

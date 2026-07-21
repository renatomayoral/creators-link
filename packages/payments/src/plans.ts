export type Plan = {
  priceId: string | undefined
  /** Monthly price in USD cents */
  amount: number
  /** Annual price in USD cents (per month) */
  amountAnnual: number
  label: string
  description: string
}

// ─── Plan definitions — Creators Link platform subscription tiers ───────────
// Free $0/mo · Creator $19/mo · Pro $79/mo
// Per-transaction fee on VIP sales shrinks as the creator upgrades — see
// TAKE_RATE_BPS below. Matches the pricing table at creatorslink.org/#precos.

export const PLANS: Record<string, Plan> = {
  // No priceId — Free is the default tier with no Stripe subscription
  // (auth/index.ts filters plans without a priceId out of the Better Auth
  // subscription plan list, so this never becomes a checkout option).
  free: {
    priceId: undefined,
    amount: 0,
    amountAnnual: 0,
    label: 'Free',
    description: 'Para começar e validar. Stripe, Pix e cripto, bot de vendas no Telegram.',
  },
  creator: {
    priceId: process.env['STRIPE_PRICE_CREATOR'],
    amount: 1900, // $19.00
    amountAnnual: 1900, // no annual discount defined yet
    label: 'Creator',
    description: 'Para criadoras em ritmo de crescimento. Sem marca, domínio próprio, PPV no Telegram.',
  },
  pro: {
    priceId: process.env['STRIPE_PRICE_PRO'],
    amount: 7900, // $79.00
    amountAnnual: 7900, // no annual discount defined yet
    label: 'Pro',
    description: 'Para quem fatura alto ou gerencia vários perfis. Múltiplos bots, CRM, suporte 24/7.',
  },
}

// ─── Legacy plan name aliases (backward compat for existing subscriptions) ───
export const PLAN_ALIASES: Record<string, string> = {
  spark: 'free',
  starter: 'free',
  studio: 'pro',
}

// ─── Platform take rate (application fee on creator VIP sales) ────────────────
// Hybrid tiered model: the platform fee on each creator sale shrinks as the
// creator upgrades, which rewards upgrading. Expressed as a percentage.
// Matches "Taxa por transação" on the pricing table: Free 9.9% · Creator 6.9% · Pro 3.9%.
export const TAKE_RATE_BPS: Record<string, number> = {
  free: 990, // 9.9%
  creator: 690, // 6.9%
  pro: 390, // 3.9%
}

/** Resolves the application-fee percent for a creator's platform plan. */
export function takeRatePercent(plan: string): number {
  const key = PLAN_ALIASES[plan] ?? plan
  const bps = TAKE_RATE_BPS[key] ?? TAKE_RATE_BPS['free']!
  return bps / 100
}

// Fixed per-transaction fee, in the smallest unit of whatever currency the
// charge is in (e.g. 30 cents, or 30 centavos for a BRL charge) — matches
// the "+ $0.30" on the pricing table. Applied on top of the percentage via
// Stripe's `application_fee_amount` (not `application_fee_percent`, which
// only supports a percentage), so callers must switch to the amount-based
// fee field once this is added — see stripe/connect.ts.
export const TAKE_RATE_FIXED_CENTS = 30

/**
 * Total application fee (percentage + fixed) for a gross charge amount, in
 * the smallest currency unit. Use this instead of `application_fee_percent`
 * so the fixed component is included.
 */
export function takeRateAmountCents(plan: string, grossAmountCents: number): number {
  const percentFee = Math.round(grossAmountCents * (takeRatePercent(plan) / 100))
  return percentFee + TAKE_RATE_FIXED_CENTS
}

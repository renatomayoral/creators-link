import Stripe from 'stripe'

// Use Restricted API Key (rk_ prefix) — NOT secret key (sk_ prefix)
// Create one at: https://dashboard.stripe.com/apikeys
// Minimum permissions needed: Products/Prices (read), Checkout Sessions (write),
// Customer Portal (write), Webhooks (read), Subscriptions (read/write)

// Lazy singleton — env vars only available at runtime in Cloud Run, not at build time
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  _stripe = new Stripe(key, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  })
  return _stripe
}

// Proxy so `stripe.xxx` calls work without explicit getStripe()
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe(), prop)
  },
})

export type Plan = {
  priceId: string | undefined
  /** Monthly price in USD cents */
  amount: number
  /** Annual price in USD cents (per month) */
  amountAnnual: number
  label: string
  description: string
}

// ─── Plan definitions — prices aligned with market research ──────────────────
// Spark $12/mo · Creator $39/mo · Pro $99/mo
// Annual = 20% discount: Spark $9.60 · Creator $31.20 · Pro $79.20

export const PLANS: Record<string, Plan> = {
  spark: {
    priceId: process.env['STRIPE_PRICE_SPARK'],
    amount: 1200,       // $12.00
    amountAnnual: 960,  // $9.60
    label: 'Spark',
    description: 'Para criadores que estão começando. Imagens ilimitadas, 5 vídeos/dia.',
  },
  creator: {
    priceId: process.env['STRIPE_PRICE_CREATOR'],
    amount: 3900,         // $39.00
    amountAnnual: 3120,   // $31.20
    label: 'Creator',
    description: 'Para criadores profissionais. I2V, LoRA, 20 vídeos/dia.',
  },
  pro: {
    priceId: process.env['STRIPE_PRICE_PRO'],
    amount: 9900,         // $99.00
    amountAnnual: 7920,   // $79.20
    label: 'Pro',
    description: 'Para volume alto e estúdios. API, LoRA training, 60 vídeos/dia.',
  },
}

// ─── Legacy plan name aliases (backward compat for existing subscriptions) ───
export const PLAN_ALIASES: Record<string, string> = {
  starter: 'spark',
  studio: 'pro',
}

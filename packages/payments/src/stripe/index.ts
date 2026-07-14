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
    apiVersion: '2026-06-24.dahlia',
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

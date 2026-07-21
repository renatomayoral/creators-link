// ─── Shared ──────────────────────────────────────────────────────────────────
export { PLANS, PLAN_ALIASES, TAKE_RATE_BPS, takeRatePercent } from './plans'
export type { Plan } from './plans'

// ─── Stripe (fiat card subscriptions) ────────────────────────────────────────
export { stripe, getStripe } from './stripe/index'
export type { default as Stripe } from 'stripe'
export {
  createConnectedAccount,
  createOnboardingLink,
  isAccountReady,
  createDashboardLink,
  createVipPrice,
  archiveVipPrice,
  createSubscriptionCheckout,
  createCryptoPaymentCheckout,
} from './stripe/connect'
export type {
  CreateConnectedAccountParams,
  OnboardingLinkParams,
  CreateVipPriceParams,
  SubscriptionCheckoutParams,
  CryptoPaymentCheckoutParams,
} from './stripe/connect'
export {
  constructWebhookEvent,
  ACCESS_GRANTING_EVENTS,
  ACCESS_REVOKING_EVENTS,
} from './stripe/webhook'

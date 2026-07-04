import type Stripe from 'stripe'
import { getStripe } from './index'
import { takeRatePercent } from '../plans'

// ─── Stripe Connect (multi-creator marketplace) ──────────────────────────────
// Each creator gets their own Express connected account. Fan subscription
// payments settle to the creator's account; the platform keeps an
// application fee (the hybrid tiered take rate from plans.ts).

export type CreateConnectedAccountParams = {
  /** Creator email — prefilled in the Stripe onboarding flow. */
  email?: string
  /** Two-letter country code of the creator, e.g. 'BR', 'US'. */
  country?: string
  /** Your internal creator id, stored on the account metadata. */
  creatorId: string
}

/** Creates an Express connected account for a creator. */
export async function createConnectedAccount(
  params: CreateConnectedAccountParams,
): Promise<Stripe.Account> {
  return getStripe().accounts.create({
    type: 'express',
    email: params.email,
    country: params.country,
    metadata: { creatorId: params.creatorId },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
}

export type OnboardingLinkParams = {
  accountId: string
  /** Where Stripe sends the creator if the link expires / they bail. */
  refreshUrl: string
  /** Where Stripe sends the creator after finishing onboarding. */
  returnUrl: string
}

/** Generates a one-time URL for the creator to complete KYC/onboarding. */
export async function createOnboardingLink(params: OnboardingLinkParams): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  })
  return link.url
}

/** True once the creator can actually accept charges & receive payouts. */
export async function isAccountReady(accountId: string): Promise<boolean> {
  const account = await getStripe().accounts.retrieve(accountId)
  return Boolean(account.charges_enabled && account.payouts_enabled)
}

/** Dashboard login link so a creator can manage their connected account. */
export async function createDashboardLink(accountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(accountId)
  return link.url
}

export type CreateVipPriceParams = {
  /** Connected account the product/price is created on. */
  creatorAccountId: string
  /** Plan title, e.g. "VIP Mensal". */
  title: string
  description?: string
  /** Price in the smallest currency unit (cents). */
  amount: number
  /** ISO 4217, e.g. 'usd', 'brl'. */
  currency: string
  /** Billing period length in days (30, 90, 365). */
  intervalDay: number
}

/**
 * Creates a recurring Price (with its Product) on the creator's connected
 * account. Returns the Price id to store on the vip_plan row.
 *
 * Stripe recurring intervals are day/week/month/year — we express everything
 * as a day interval with a count so 30/90/365 map cleanly.
 */
export async function createVipPrice(params: CreateVipPriceParams): Promise<string> {
  const stripe = getStripe()
  const opts = { stripeAccount: params.creatorAccountId }

  const product = await stripe.products.create(
    { name: params.title, description: params.description },
    opts,
  )
  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: params.amount,
      currency: params.currency,
      recurring: { interval: 'day', interval_count: params.intervalDay },
    },
    opts,
  )
  return price.id
}

/** Deactivates a Price on the connected account (Prices can't be deleted). */
export async function archiveVipPrice(creatorAccountId: string, priceId: string): Promise<void> {
  await getStripe().prices.update(priceId, { active: false }, { stripeAccount: creatorAccountId })
}

export type SubscriptionCheckoutParams = {
  /** Connected account of the creator receiving the money. */
  creatorAccountId: string
  /** The creator's platform plan — decides the application-fee percent. */
  creatorPlatformPlan: string
  /** Stripe Price id of the VIP plan the fan is subscribing to. */
  priceId: string
  /** Internal reference (subscription/creator/fan ids). */
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
  /** Optional fan email to prefill checkout. */
  customerEmail?: string
}

/**
 * Creates a Checkout Session for a fan subscribing to a creator's VIP.
 *
 * Uses destination charges: the charge is created on the platform account,
 * the funds are transferred to the creator's connected account, and the
 * platform keeps `application_fee_percent` of each recurring payment.
 */
export async function createSubscriptionCheckout(
  params: SubscriptionCheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const feePercent = takeRatePercent(params.creatorPlatformPlan)
  return getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer_email: params.customerEmail,
    subscription_data: {
      application_fee_percent: feePercent,
      transfer_data: { destination: params.creatorAccountId },
      metadata: params.metadata ?? {},
    },
    metadata: params.metadata ?? {},
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })
}

export type CryptoPaymentCheckoutParams = {
  /** Connected account of the creator receiving the money. */
  creatorAccountId: string
  /** The creator's platform plan — decides the application-fee percent. */
  creatorPlatformPlan: string
  title: string
  /** Amount in the smallest currency unit (cents). */
  amount: number
  /** ISO 4217, e.g. 'usd'. Stripe crypto payments currently require USD. */
  currency: string
  /** Internal reference (plan/creator/fan ids). */
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

/**
 * Creates a one-time Checkout Session paid with stablecoins.
 *
 * Stripe crypto payments don't support `mode: 'subscription'` — each billing
 * period is a separate one-time payment. Access is granted for the plan's
 * interval and the fan is emailed a renewal link before it expires (see the
 * crypto-renewal-reminder cron).
 */
export async function createCryptoPaymentCheckout(
  params: CryptoPaymentCheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const feePercent = takeRatePercent(params.creatorPlatformPlan)
  const applicationFeeAmount = Math.round(params.amount * (feePercent / 100))
  return getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['crypto'],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          unit_amount: params.amount,
          product_data: { name: params.title },
        },
        quantity: 1,
      },
    ],
    customer_email: params.customerEmail,
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: params.creatorAccountId },
      metadata: params.metadata ?? {},
    },
    metadata: params.metadata ?? {},
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })
}

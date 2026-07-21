import { createVerify, createHmac, randomUUID } from 'node:crypto'

// Confirmed against the live API on 2026-07-21: base host is mapi.boomfi.xyz
// (not api.boomfi.xyz), and auth is a flat `x-api-key` header — no Bearer
// token, no HMAC signing for this API (that's only for the Partners API
// below, per docs.boomfi.xyz/reference/partners-authentication).
const BOOMFI_API_BASE = 'https://mapi.boomfi.xyz/v1'
const BOOMFI_PARTNERS_API_BASE = 'https://mapi.boomfi.xyz/partners'

function apiKey(): string {
  const key = process.env['BOOMFI_API_KEY']
  if (!key) throw new Error('BOOMFI_API_KEY not set')
  return key
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BOOMFI_API_BASE}${path}`, {
    ...init,
    headers: {
      'accept': 'application/json',
      'x-api-key': apiKey(),
      'content-type': 'application/json',
      ...init?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`BoomFi error: ${JSON.stringify(data)}`)
  return data
}

// ─── Settlement accounts (org-level chains enabled for crypto pay-in) ───────
// Source of truth for which chains the platform's own account can settle to
// — the coin catalog offered to creators must be a subset of this, since the
// deposit_split's platform-fee leg needs a matching chain to land in.

export type SettlementAccount = {
  id: number
  chainId: number
  chainName: string
  nativeCurrencySymbol: string
  address: string
  enabled: boolean
}

export async function listSettlementAccounts(): Promise<SettlementAccount[]> {
  const data = await request<{
    data: {
      items: Array<{
        id: number
        chain_id: number
        address: string
        enabled: boolean
        chain: { id: number; name: string; native_currency_symbol: string }
      }>
    }
  }>('/accounts')
  return data.data.items.map(item => ({
    id: item.id,
    chainId: item.chain_id,
    chainName: item.chain.name,
    nativeCurrencySymbol: item.chain.native_currency_symbol,
    address: item.address,
    enabled: item.enabled,
  }))
}

// ─── Pay links (one-time crypto charge) ──────────────────────────────────────

export type BoomfiPayLink = {
  id: string
  url: string
  status: string
}

export async function createPayLink(params: {
  amount: number
  currency: string
  orderId: string
  description: string
  redirectUrl?: string
}): Promise<BoomfiPayLink> {
  const data = await request<{ id: string; url: string; status: string }>('/paylinks', {
    method: 'POST',
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      reference_id: params.orderId,
      description: params.description,
      redirect_url: params.redirectUrl,
    }),
  })
  return { id: data.id, url: data.url, status: data.status }
}

// ─── Plans (recurring subscriptions) ─────────────────────────────────────────

export type BoomfiPlan = {
  id: string
  name: string
  currency: string
  amount: number
  intervalDay: number
}

export async function createPlan(params: {
  name: string
  currency: string // e.g. "usd"
  amount: number // decimal, e.g. 9.90
  intervalDay: number
}): Promise<BoomfiPlan> {
  const data = await request<{
    id: string
    name: string
    currency: string
    amount: number
    recurring: { interval: string; interval_count: number }
  }>('/plans', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      type: 'Recurring',
      currency: params.currency,
      amount: params.amount,
      recurring: { interval: 'day', interval_count: params.intervalDay },
    }),
  })
  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    amount: data.amount,
    intervalDay: data.recurring?.interval_count ?? params.intervalDay,
  }
}

export async function getPlan(planId: string): Promise<BoomfiPlan> {
  const data = await request<{
    id: string
    name: string
    currency: string
    amount: number
    recurring: { interval_count: number }
  }>(`/plans/${planId}`)
  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    amount: data.amount,
    intervalDay: data.recurring?.interval_count ?? 30,
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export type BoomfiSubscription = {
  id: string
  planId: string
  status: 'Pending' | 'Active' | 'Canceled'
  customerId: string
}

export async function listSubscriptions(customerId?: string): Promise<BoomfiSubscription[]> {
  const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''
  const data = await request<{
    data: Array<{ id: string; plan_id: string; status: string; customer_id: string }>
  }>(`/subscriptions${qs}`)
  return data.data.map(r => ({
    id: r.id,
    planId: r.plan_id,
    status: r.status as BoomfiSubscription['status'],
    customerId: r.customer_id,
  }))
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await request(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

// ─── Customers ────────────────────────────────────────────────────────────────

export type BoomfiCustomer = {
  id: string
  email?: string
}

export async function createCustomer(params: {
  externalId: string
  email?: string
}): Promise<BoomfiCustomer> {
  const data = await request<{ id: string; email?: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({ reference_id: params.externalId, email: params.email }),
  })
  return { id: data.id, email: data.email }
}

// ─── Partners API — Virtual Accounts (per-creator settlement + deposit split) ─
// Separate auth scheme from the main API: header-based HMAC-SHA256 signing.
// Docs: https://docs.boomfi.xyz/reference/partners-authentication
//
// STATUS (confirmed 2026-07-21): every /partners/* route returns 404 for this
// account (create-virtual-account, get-account-by-reference, payout/address),
// despite valid X-API-Key + X-API-Signature — the Partners API program isn't
// enabled for this merchant yet. Until BoomFi enables it, the platform can't
// split fees or auto-payout via the API. Current model: payments settle to
// the platform's own settlement accounts (GET /v1/accounts, main API), and
// the creator's share is paid out manually/off-platform. Keep these functions
// around unused — swap crypto/setup and the webhook over to them once BoomFi
// confirms access.

async function partnersRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKeyVal = process.env['BOOMFI_PARTNERS_API_KEY']
  const signingSecret = process.env['BOOMFI_PARTNERS_SIGNING_SECRET']
  if (!apiKeyVal || !signingSecret) throw new Error('BoomFi Partners API credentials not set')

  const nonce = randomUUID()
  const bodyStr = body ? JSON.stringify(body) : ''
  const signingData = `${method}${path}${nonce}${bodyStr}`
  const signature = createHmac('sha256', signingSecret).update(signingData).digest('hex')

  const res = await fetch(`${BOOMFI_PARTNERS_API_BASE}${path}`, {
    method,
    headers: {
      'X-API-Key': apiKeyVal,
      'X-API-Nonce': nonce,
      'X-API-Signature': signature,
      'content-type': 'application/json',
    },
    body: bodyStr || undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`BoomFi Partners API error: ${JSON.stringify(data)}`)
  return data
}

export type DepositSplit = {
  /** Percentage (0-100) of the gross deposit routed to this destination, e.g. 10 for 10% */
  percentage: number
  /** Reference of the destination Virtual Account (e.g. our platform account) */
  destinationRef: string
}

export type VirtualAccountChain = {
  chainId: number
  currencies: string[] // e.g. ["USDT", "USDC"]
  walletAddress: string
}

export type VirtualAccount = {
  reference: string
  name: string
}

/**
 * Creates a per-creator Virtual Account with external settlement wallets and
 * a deposit split that routes the platform fee automatically at pay-in time
 * — the rest settles directly to the creator's wallet(s).
 *
 * IMPORTANT: as of 2026-07-21 this endpoint (`/partners/accounts/create-virtual-account`)
 * returns 404 against the live BoomFi API despite valid Partners API credentials
 * (X-API-Key + X-API-Signature) — the Partners API program appears to need
 * separate activation by BoomFi for this account. Field shapes below are
 * confirmed correct against BoomFi's published OpenAPI spec (partners.CreateVirtualAccountRequest),
 * so this should work once/if the route is enabled — but it is UNVERIFIED
 * end-to-end. Do not assume it works without testing again once BoomFi
 * confirms Partners API access.
 */
export async function createVirtualAccount(params: {
  reference: string // our creator.id
  name: string
  chains: VirtualAccountChain[]
  platformSplit: DepositSplit
}): Promise<VirtualAccount> {
  const data = await partnersRequest<{ reference: string; name: string }>(
    'POST',
    '/accounts/create-virtual-account',
    {
      name: params.name,
      reference: params.reference,
      chains: params.chains.map(c => ({
        chain_id: c.chainId,
        currencies: c.currencies,
        wallet_address: c.walletAddress,
      })),
      deposit_splits: [
        { account_ref: params.platformSplit.destinationRef, pct: String(params.platformSplit.percentage) },
      ],
    },
  )
  return { reference: data.reference, name: data.name }
}

export async function getAccountBalances(accountRef: string): Promise<
  Array<{ currency: string; balance: number }>
> {
  const data = await partnersRequest<{ balances: Array<{ currency: string; balance: number }> }>(
    'GET',
    `/accounts/${accountRef}/balances`,
  )
  return data.balances ?? []
}

export async function createCryptoPayout(params: {
  accountRef: string
  amount: string
  currency: string
  chainId: number
  walletAddress: string
  reference?: string
}): Promise<void> {
  await partnersRequest('POST', `/accounts/${params.accountRef}/crypto-payout`, {
    amount: params.amount,
    ccy: params.currency,
    chain_id: params.chainId,
    wallet_address: params.walletAddress,
    reference: params.reference,
  })
}

// ─── Webhook signature verification ──────────────────────────────────────────
// Per https://docs.boomfi.xyz/docs/webhook-signatures — RSA-SHA256 over
// "{timestamp}.{raw_body}", verified with BoomFi's public signing key.

export function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  const publicKey = process.env['BOOMFI_WEBHOOK_PUBLIC_KEY'] ?? ''
  if (!publicKey) return false

  const maxSkewSeconds = 5 * 60
  const tsSeconds = Number(timestamp)
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > maxSkewSeconds) {
    return false
  }

  const message = `${timestamp}.${rawBody}`
  const verifier = createVerify('SHA256')
  verifier.update(message)
  verifier.end()
  try {
    return verifier.verify(publicKey, signature, 'base64')
  } catch {
    return false
  }
}

import NOWPaymentsApi from '@nowpaymentsio/nowpayments-api-js'
import { createHmac } from 'node:crypto'

function getClient() {
  const apiKey = process.env['NOWPAYMENTS_API_KEY']
  if (!apiKey) throw new Error('NOWPAYMENTS_API_KEY not set')
  return new NOWPaymentsApi({ apiKey })
}

export type CreatePaymentResult = {
  paymentId: string
  paymentStatus: string
  payAddress: string
  payCurrency: string
  payAmount: number
  priceAmount: number
  priceCurrency: string
  invoiceUrl: string
}

export async function createPayment(params: {
  priceAmount: number
  priceCurrency: string
  payCurrency: string
  orderId: string
  orderDescription: string
  ipnCallbackUrl: string
}): Promise<CreatePaymentResult> {
  const api = getClient()
  const data = await api.createPayment({
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency,
    pay_currency: params.payCurrency,
    order_id: params.orderId,
    order_description: params.orderDescription,
    ipn_callback_url: params.ipnCallbackUrl,
  })

  if (!('payment_id' in data)) throw new Error(`NowPayments error: ${JSON.stringify(data)}`)

  return {
    paymentId: String(data.payment_id),
    paymentStatus: data.payment_status,
    payAddress: data.pay_address,
    payCurrency: data.pay_currency,
    payAmount: data.pay_amount,
    priceAmount: data.price_amount,
    priceCurrency: data.price_currency,
    invoiceUrl: `https://nowpayments.io/payment/?iid=${data.payment_id}`,
  }
}

export async function createInvoice(params: {
  priceAmount: number
  priceCurrency: string
  payCurrency?: string
  orderId: string
  orderDescription: string
  ipnCallbackUrl: string
  successUrl?: string
  cancelUrl?: string
}) {
  const api = getClient()
  const data = await api.createInvoice({
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency,
    pay_currency: params.payCurrency,
    order_id: params.orderId,
    order_description: params.orderDescription,
    ipn_callback_url: params.ipnCallbackUrl,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })

  if ('message' in data) throw new Error(`NowPayments error: ${data.message}`)
  return data
}

export async function getPaymentStatus(paymentId: string) {
  const api = getClient()
  const data = await api.getPaymentStatus({ payment_id: paymentId })
  if ('message' in data) throw new Error(`NowPayments error: ${data.message}`)
  return data
}

export async function getCurrencies() {
  const api = getClient()
  const data = await api.getCurrencies()
  if ('message' in data) throw new Error(`NowPayments error: ${data.message}`)
  return data
}

// ─── Subscriptions (recurring payments) ──────────────────────────────────────

// The SDK doesn't cover subscriptions yet — calling the REST API directly.

async function authToken(): Promise<string> {
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const email = process.env['NOWPAYMENTS_EMAIL'] ?? ''
  const password = process.env['NOWPAYMENTS_PASSWORD'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/auth', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('NowPayments auth failed')
  return data.token
}

export type NowSubscription = {
  id: string
  subscriptionPlanId: string
  isActive: boolean
  status: 'WAITING_PAY' | 'PAID' | 'PARTIALLY_PAID' | 'EXPIRED'
  expireDate: string
  subscriber: { email?: string; sub_partner_id?: string }
  createdAt: string
  updatedAt: string
}

export async function createSubscription(params: {
  subscriptionPlanId: number | string
  email: string
}): Promise<NowSubscription> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      subscription_plan_id: Number(params.subscriptionPlanId),
      email: params.email,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments subscription error: ${JSON.stringify(data)}`)
  const r = data.result
  return {
    id: String(r.id),
    subscriptionPlanId: String(r.subscription_plan_id),
    isActive: r.is_active,
    status: r.status,
    expireDate: r.expire_date,
    subscriber: r.subscriber,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getSubscription(subId: string): Promise<NowSubscription> {
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch(`https://api.nowpayments.io/v1/subscriptions/${subId}`, {
    headers: { 'x-api-key': apiKey },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments error: ${JSON.stringify(data)}`)
  const r = data.result
  return {
    id: String(r.id),
    subscriptionPlanId: String(r.subscription_plan_id),
    isActive: r.is_active,
    status: r.status,
    expireDate: r.expire_date,
    subscriber: r.subscriber,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ─── Subscription Plans (created per VIP plan) ───────────────────────────────

export type NowSubscriptionPlan = {
  id: string
  title: string
  currency: string
  amount: number
  intervalDay: number
  createdAt: string
}

export async function createSubscriptionPlan(params: {
  title: string
  currency: string   // e.g. "usd"
  amount: number     // decimal, e.g. 9.90
  intervalDay: number
}): Promise<NowSubscriptionPlan> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/subscription-plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: params.title,
      currency: params.currency,
      amount: params.amount,
      interval_day: params.intervalDay,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments createSubscriptionPlan error: ${JSON.stringify(data)}`)
  const r = data.result ?? data
  return {
    id: String(r.id),
    title: r.title,
    currency: r.currency,
    amount: r.amount,
    intervalDay: r.interval_day,
    createdAt: r.created_at,
  }
}

export async function deleteSubscription(subId: string): Promise<void> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  await fetch(`https://api.nowpayments.io/v1/subscriptions/${subId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'x-api-key': apiKey },
  })
}

// ─── Custody — Customer management ───────────────────────────────────────────
// Requires Custody to be activated in the NowPayments dashboard.

export type NowCustomer = {
  id: string
  externalId: string
  email?: string
  createdAt: string
}

export async function createCustomer(params: {
  externalId: string  // our creator.id
  email?: string
}): Promise<NowCustomer> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      external_id: params.externalId,
      email: params.email,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments createCustomer error: ${JSON.stringify(data)}`)
  const r = data.result ?? data
  return { id: String(r.id), externalId: r.external_id, email: r.email, createdAt: r.created_at }
}

export type CustomerBalance = {
  currency: string
  balance: number
}

export async function getCustomerBalance(customerId: string): Promise<CustomerBalance[]> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch(`https://api.nowpayments.io/v1/customers/${customerId}/balance`, {
    headers: { 'Authorization': `Bearer ${token}`, 'x-api-key': apiKey },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments getCustomerBalance error: ${JSON.stringify(data)}`)
  const balances: CustomerBalance[] = []
  for (const [currency, balance] of Object.entries(data.result ?? data)) {
    balances.push({ currency, balance: Number(balance) })
  }
  return balances
}

// Transfer from master account to a customer (after fee deduction)
export async function transferToCustomer(params: {
  customerId: string
  currency: string   // e.g. "usdttrc20"
  amount: number
}): Promise<void> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/custody/transfer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      currency: params.currency,
      amount: params.amount,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments transferToCustomer error: ${JSON.stringify(data)}`)
}

// Withdraw from customer balance to their external wallet
export async function withdrawFromCustomer(params: {
  customerId: string
  address: string
  currency: string
  amount: number
}): Promise<{ withdrawalId: string }> {
  const token = await authToken()
  const apiKey = process.env['NOWPAYMENTS_API_KEY'] ?? ''
  const res = await fetch('https://api.nowpayments.io/v1/custody/withdrawal', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      address: params.address,
      currency: params.currency,
      amount: params.amount,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`NowPayments withdrawFromCustomer error: ${JSON.stringify(data)}`)
  const r = data.result ?? data
  return { withdrawalId: String(r.id) }
}

export function verifyIpnSignature(payload: string, signature: string): boolean {
  const secret = process.env['NOWPAYMENTS_IPN_SECRET'] ?? ''
  const hmac = createHmac('sha512', secret).update(payload).digest('hex')
  return hmac === signature
}

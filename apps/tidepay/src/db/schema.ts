import { pgTable, text, timestamp, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

// tidepay owns this schema in full (no @repo/db import), so it can be lifted
// into a standalone service later. Business tables are prefixed `tidepay_`.
// Better Auth tables keep their default names (the adapter expects them) and
// are scaffolded here for the future merchant dashboard.

// ─── Merchant — a tenant consuming tidepay (creatorslink is the first) ───────

export const merchant = pgTable(
  'tidepay_merchant',
  {
    id: text('id').primaryKey(),
    /** The dashboard user who owns/manages this merchant. Null for merchants seeded outside the dashboard. */
    ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    /** sha256 of the raw API key. Raw key is shown once at creation, never stored. */
    apiKeyHash: text('api_key_hash').notNull(),
    /** First chars of the raw key, for display/lookup in dashboards. */
    apiKeyPrefix: text('api_key_prefix').notNull(),
    /** Platform take-rate as a decimal percent string, e.g. "2.50" for 2.5%. */
    takeRatePct: text('take_rate_pct')
      .$defaultFn(() => '0')
      .notNull(),
    /** Where the take-rate lands. Falls back to PLATFORM_WALLET_ADDRESS if null. */
    platformWallet: text('platform_wallet'),
    /** Merchant endpoint that receives signed webhooks. */
    webhookUrl: text('webhook_url'),
    /** Per-merchant HMAC secret used to sign outbound webhooks. */
    webhookSecret: text('webhook_secret'),
    status: text('status', { enum: ['active', 'suspended'] })
      .$defaultFn(() => 'active')
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('tidepay_merchant_api_key_hash_idx').on(t.apiKeyHash),
    index('tidepay_merchant_api_key_prefix_idx').on(t.apiKeyPrefix),
    index('tidepay_merchant_owner_user_id_idx').on(t.ownerUserId),
  ],
)

// ─── Plan — a recurring subscription offer created by a merchant ─────────────

export const plan = pgTable(
  'tidepay_plan',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchant.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Human decimal amount per cycle, e.g. "9.90". Converted to base units at charge time. */
    amount: text('amount').notNull(),
    /** Catalog key encoding token+chain, e.g. "usdc-polygon" (see lib/crypto-coins.ts). */
    tokenKey: text('token_key').notNull(),
    /** Denormalized from tokenKey for cheap cron filtering. */
    chainId: integer('chain_id').notNull(),
    intervalDay: integer('interval_day')
      .$defaultFn(() => 30)
      .notNull(),
    /** Where the merchant's share of each charge settles. */
    merchantDestinationWallet: text('merchant_destination_wallet').notNull(),
    active: boolean('active')
      .$defaultFn(() => true)
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index('tidepay_plan_merchant_id_idx').on(t.merchantId)],
)

// ─── Subscription — a subscriber wallet's recurring commitment to a plan ─────

export const subscription = pgTable(
  'tidepay_subscription',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchant.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plan.id, { onDelete: 'restrict' }),
    /** Subscriber's wallet address, stored lowercased. Null until they connect. */
    subscriberWallet: text('subscriber_wallet'),
    status: text('status', { enum: ['pending', 'active', 'past_due', 'canceled'] })
      .$defaultFn(() => 'pending')
      .notNull(),
    /** True once we read a sufficient on-chain allowance for this subscriber. */
    allowanceConfirmed: boolean('allowance_confirmed')
      .$defaultFn(() => false)
      .notNull(),
    currentPeriodEnd: timestamp('current_period_end'),
    /** Denormalized from plan for cron filtering. */
    chainId: integer('chain_id').notNull(),
    /** Merchant's own id for this subscription, for reconciliation. */
    merchantReferenceId: text('merchant_reference_id'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('tidepay_subscription_merchant_id_idx').on(t.merchantId),
    index('tidepay_subscription_status_idx').on(t.status),
    index('tidepay_subscription_current_period_end_idx').on(t.currentPeriodEnd),
    uniqueIndex('tidepay_subscription_plan_wallet_idx').on(t.planId, t.subscriberWallet),
  ],
)

// ─── Charge — one row per cycle attempt; the source of truth for revenue ─────
// On-chain legs are non-atomic, so each leg's tx hash is tracked separately and
// the staged status makes a crashed/retried cycle resumable without re-pulling.

export const charge = pgTable(
  'tidepay_charge',
  {
    id: text('id').primaryKey(),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchant.id, { onDelete: 'cascade' }),
    /** `${subscriptionId}:${periodStartEpoch}` — the double-charge guard. */
    idempotencyKey: text('idempotency_key').notNull(),
    /** All amounts in token base units, as decimal strings (never floats). */
    grossAmount: text('gross_amount').notNull(),
    platformAmount: text('platform_amount').notNull(),
    merchantAmount: text('merchant_amount').notNull(),
    tokenKey: text('token_key').notNull(),
    chainId: integer('chain_id').notNull(),
    /** transferFrom(subscriber -> operator) leg. */
    pullTxHash: text('pull_tx_hash'),
    /** transfer(operator -> merchant destination) leg. */
    merchantTransferTxHash: text('merchant_transfer_tx_hash'),
    /** transfer(operator -> platform wallet) leg. */
    platformTransferTxHash: text('platform_transfer_tx_hash'),
    status: text('status', { enum: ['pending', 'pulled', 'settled', 'failed'] })
      .$defaultFn(() => 'pending')
      .notNull(),
    failureReason: text('failure_reason'),
    attempts: integer('attempts')
      .$defaultFn(() => 0)
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('tidepay_charge_idempotency_key_idx').on(t.idempotencyKey),
    index('tidepay_charge_subscription_id_idx').on(t.subscriptionId),
    index('tidepay_charge_status_idx').on(t.status),
  ],
)

// ─── Webhook delivery — outbound signed events to merchants, with retries ────

export const webhookDelivery = pgTable(
  'tidepay_webhook_delivery',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchant.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    /** JSON-serialized payload (the exact bytes that were signed). */
    payload: text('payload').notNull(),
    signature: text('signature').notNull(),
    status: text('status', { enum: ['pending', 'delivered', 'failed'] })
      .$defaultFn(() => 'pending')
      .notNull(),
    attempts: integer('attempts')
      .$defaultFn(() => 0)
      .notNull(),
    lastAttemptAt: timestamp('last_attempt_at'),
    responseStatus: integer('response_status'),
    nextRetryAt: timestamp('next_retry_at'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('tidepay_webhook_delivery_merchant_id_idx').on(t.merchantId),
    index('tidepay_webhook_delivery_status_idx').on(t.status),
    index('tidepay_webhook_delivery_next_retry_at_idx').on(t.nextRetryAt),
  ],
)

// ─── Rate limit — fixed-window counter for public routes ─────────────────────
// Backed by Postgres (no Redis/Upstash dependency) since expected volume is
// low initially. `key` is caller-defined, e.g. `apikey:{merchantId}` or
// `ip:{address}`; each request does a read-then-increment within the current
// window, so there's a small race window under heavy concurrent load — this
// is a blunt abuse guard, not a precise limiter.

export const rateLimit = pgTable(
  'tidepay_rate_limit',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    windowStart: timestamp('window_start').notNull(),
    count: integer('count')
      .$defaultFn(() => 0)
      .notNull(),
  },
  (t) => [uniqueIndex('tidepay_rate_limit_key_window_idx').on(t.key, t.windowStart)],
)

// ─── Better Auth (merchant dashboard) — default table names required ─────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
})

export const schema = {
  merchant,
  plan,
  subscription,
  charge,
  webhookDelivery,
  rateLimit,
  user,
  session,
  account,
  verification,
}

import { pgTable, text, timestamp, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Platforms — available link platforms (admin-managed) ────────────────────

export const platform = pgTable(
  'platform',
  {
    id: text('id').primaryKey(),
    /** Internal key used as the `platform` field in creator_link, e.g. "onlyfans" */
    key: text('key').notNull(),
    label: text('label').notNull(),
    color: text('color').notNull(),
    baseUrl: text('base_url').notNull(),
    /** Sort position in lists */
    sortOrder: integer('sort_order')
      .$defaultFn(() => 0)
      .notNull(),
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
  (t) => [uniqueIndex('platform_key_idx').on(t.key)],
)

// ─── Creators — one link-in-bio page per content creator ─────────────────────
// Owned by an authenticated user (the agency/manager account). The public
// page is served at /p/{slug}.

export const creator = pgTable(
  'creator',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** Display name, e.g. "Babi Barelli" */
    name: text('name').notNull(),
    /** URL slug — unique, e.g. "babi" → /p/babi */
    slug: text('slug').notNull().unique(),
    /** Social handle shown under the name, e.g. "@babibarelli" */
    handle: text('handle'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    /** Neon accent used by the public page */
    accentColor: text('accent_color')
      .$defaultFn(() => '#ec4899')
      .notNull(),
    /** Custom domain the creator owns, e.g. "amanda-zarayeva.com" */
    customDomain: text('custom_domain').unique(),
    /** Stripe Connect (Express) account id, e.g. "acct_..." — null until connected */
    stripeAccountId: text('stripe_account_id').unique(),
    /** True once charges & payouts are enabled on the connected account */
    stripeOnboarded: boolean('stripe_onboarded')
      .$defaultFn(() => false)
      .notNull(),
    /** Telegram bot token from @BotFather — used to gate the creator's VIP channel */
    telegramBotToken: text('telegram_bot_token'),
    /** 'live' | 'draft' */
    status: text('status')
      .$defaultFn(() => 'draft')
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index('creator_user_idx').on(t.userId)],
)

// ─── Links — the buttons rendered on a creator's page ────────────────────────

export const creatorLink = pgTable(
  'creator_link',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Platform key — see PLATFORMS in apps/web/src/lib/creators.ts */
    platform: text('platform').notNull(),
    /** Optional override label; falls back to the platform's default label */
    label: text('label'),
    /** Destination URL the click redirects to */
    url: text('url').notNull(),
    sortOrder: integer('sort_order')
      .$defaultFn(() => 0)
      .notNull(),
    active: boolean('active')
      .$defaultFn(() => true)
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index('creator_link_creator_idx').on(t.creatorId)],
)

// ─── Clicks — one row per redirect through /r/{linkId} ───────────────────────
// `creatorId` is denormalised so per-creator aggregation needs no join.

export const linkClick = pgTable(
  'link_click',
  {
    id: text('id').primaryKey(),
    linkId: text('link_id')
      .notNull()
      .references(() => creatorLink.id, { onDelete: 'cascade' }),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    referrer: text('referrer'),
    country: text('country'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('link_click_creator_created_idx').on(t.creatorId, t.createdAt),
    index('link_click_link_idx').on(t.linkId),
  ],
)

// ─── VIP plans — paid subscription tiers a creator sells to fans ─────────────
// Each plan maps to a Stripe Price on the creator's connected account.

export const vipPlan = pgTable(
  'vip_plan',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Display name, e.g. "VIP Mensal" */
    title: text('title').notNull(),
    description: text('description'),
    /** Price in cents, in `currency` */
    amount: integer('amount').notNull(),
    /** ISO 4217, e.g. "usd", "brl" */
    currency: text('currency')
      .$defaultFn(() => 'usd')
      .notNull(),
    /** Billing period in days, e.g. 30 (monthly), 90 (quarterly), 365 (annual) */
    intervalDay: integer('interval_day')
      .$defaultFn(() => 30)
      .notNull(),
    /** Stripe Price id on the creator's connected account, e.g. "price_..." */
    stripePriceId: text('stripe_price_id'),
    /** NOWPayments subscription plan id (optional crypto track) */
    nowpaymentsPlanId: text('nowpayments_plan_id'),
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
  (t) => [index('vip_plan_creator_idx').on(t.creatorId)],
)

// ─── VIP subscriptions — one row per fan's active/past subscription ──────────
// Drives access to the creator's gated channel (Telegram, etc).

export const vipSubscription = pgTable(
  'vip_subscription',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => vipPlan.id, { onDelete: 'restrict' }),
    /** Fan email (from checkout) */
    fanEmail: text('fan_email'),
    /** Which rail processed this: 'stripe' | 'nowpayments' */
    provider: text('provider').notNull(),
    /** Stripe Subscription id, e.g. "sub_..." (stripe rail) */
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    /** Stripe Customer id, e.g. "cus_..." (stripe rail) */
    stripeCustomerId: text('stripe_customer_id'),
    /** NOWPayments subscription id (crypto rail) */
    nowpaymentsSubscriptionId: text('nowpayments_subscription_id').unique(),
    /** 'active' | 'past_due' | 'canceled' | 'expired' */
    status: text('status')
      .$defaultFn(() => 'active')
      .notNull(),
    /** When the current paid period ends — access granted until here */
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('vip_subscription_creator_idx').on(t.creatorId),
    index('vip_subscription_status_idx').on(t.status),
  ],
)

// ─── Platform OAuth tokens — one row per creator per platform ─────────────────
// Stores OAuth access/refresh tokens so the platform can call APIs on behalf
// of each creator. Each row is keyed by (creatorId, platform).

export const platformToken = pgTable(
  'platform_token',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Platform identifier, e.g. 'fanvue', 'onlyfans' */
    platform: text('platform').notNull(),
    /** OAuth access token (short-lived) */
    accessToken: text('access_token').notNull(),
    /** OAuth refresh token (long-lived) — used to renew access token */
    refreshToken: text('refresh_token'),
    /** When the access token expires */
    expiresAt: timestamp('expires_at'),
    /** Scopes granted, e.g. ["read:self","read:subscribers","write:posts"] */
    scopes: text('scopes')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    /** Platform user UUID (e.g. Fanvue user uuid) */
    platformUserId: text('platform_user_id'),
    /** Platform username/handle for display */
    platformHandle: text('platform_handle'),
    /** Fallback: manually entered API token (when OAuth not used) */
    apiToken: text('api_token'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('platform_token_creator_platform_idx').on(t.creatorId, t.platform),
    index('platform_token_creator_idx').on(t.creatorId),
  ],
)

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
    /**
     * Where Stripe card payments settle: 'own' pays out to this creator's own
     * connected account (default); 'centralized' routes the fan's payment to
     * another creator (payoutHubCreatorId) owned by the same user instead —
     * e.g. an agency funneling all its creators' card revenue into one hub
     * account. Only ever points to another creator with the same userId
     * (enforced at the API layer, not the DB).
     */
    stripePayoutMode: text('stripe_payout_mode')
      .$defaultFn(() => 'own')
      .notNull(),
    /** Hub creator id to settle to when stripePayoutMode = 'centralized' */
    payoutHubCreatorId: text('payout_hub_creator_id'),
    /** Telegram channel username or id, e.g. "@babibarelli_vip" or "-1001234567890" */
    telegramChannelId: text('telegram_channel_id'),
    /** Human-readable channel title for display, e.g. "VIP da Babi 🔥" */
    telegramChannelTitle: text('telegram_channel_title'),
    /** Photo uploaded here and applied to the Telegram channel via setChatPhoto */
    channelPhotoUrl: text('channel_photo_url'),
    /** Pix key for receiving splits, e.g. CPF, email, phone, random key */
    pixKey: text('pix_key'),
    /** Type of Pix key: cpf | cnpj | email | phone | random */
    pixKeyType: text('pix_key_type'),
    /** Platform fee percentage charged by Creators Link, e.g. 10.00 = 10% */
    platformFeePct: text('platform_fee_pct')
      .$defaultFn(() => '10.00')
      .notNull(),
    /**
     * BoomFi Partners API Virtual Account reference (== creator.id). NOT USED
     * YET — the Partners API (per-creator settlement + automatic fee split)
     * isn't enabled for this merchant (confirmed 2026-07-21). Column kept so
     * we don't need another migration once BoomFi enables it; see
     * apps/web/src/lib/boomfi.ts createVirtualAccount for the ready-to-use code.
     */
    boomfiAccountRef: text('boomfi_account_ref').unique(),
    /** Payment methods accepted: stripe, pix_manual, pix_auto */
    acceptedPayments: text('accepted_payments')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    /**
     * Page template key, e.g. 'neon-dark', 'rose-glam', 'minimal-white'.
     * Controls the overall look of /p/[slug].
     */
    pageTemplate: text('page_template')
      .$defaultFn(() => 'neon-dark')
      .notNull(),
    /**
     * JSON blob with per-template overrides: accentColor, bgColor, fontFamily, etc.
     * Stored as text and parsed at runtime.
     */
    pageConfig: text('page_config'),
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

// ─── Creator accepted crypto coins — one row per coin the creator accepts ────
// A creator can accept several coins/chains at once (e.g. USDT on Polygon AND
// USDC on Solana). `coinKey` references a fixed catalog in
// apps/web/src/lib/crypto-coins.ts (chain id + ticker known upfront), so the
// UI is a checkbox list instead of free-text chain/ticker fields.
//
// NOTE: BoomFi's Partners API (per-creator settlement account + automatic fee
// split) isn't enabled for this merchant yet (confirmed 2026-07-21 — see
// apps/web/src/lib/boomfi.ts). Until it is, crypto payments settle to the
// platform's own BoomFi settlement accounts, not a creator wallet — so this
// table only tracks which coins a creator has opted into accepting, not a
// payout destination. The platform's share owed to the creator is tracked via
// `payment` and paid out manually off-platform.

export const creatorCryptoCoin = pgTable(
  'creator_crypto_coin',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Key into the CRYPTO_COINS catalog, e.g. "usdt-polygon", "usdc-solana" */
    coinKey: text('coin_key').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('creator_crypto_coin_creator_idx').on(t.creatorId),
    uniqueIndex('creator_crypto_coin_creator_coin_idx').on(t.creatorId, t.coinKey),
  ],
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

export const vipPlan = pgTable(
  'vip_plan',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Display name, e.g. "VIP Basic" */
    title: text('title').notNull(),
    description: text('description'),
    /** Billing period in days, e.g. 30 (monthly), 90 (quarterly), 365 (annual) */
    intervalDay: integer('interval_day')
      .$defaultFn(() => 30)
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
  (t) => [index('vip_plan_creator_idx').on(t.creatorId)],
)

// ─── VIP plan prices — one row per currency/provider per plan ─────────────────
// A plan can have prices in BRL (pix_auto, pix_manual) and USD/EUR (stripe).

export const vipPlanPrice = pgTable(
  'vip_plan_price',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => vipPlan.id, { onDelete: 'cascade' }),
    /** ISO 4217 lowercase, e.g. "brl", "usd", "eur" */
    currency: text('currency').notNull(),
    /** Amount in the smallest currency unit (centavos / cents) */
    amountCents: integer('amount_cents').notNull(),
    /** Payment provider: stripe | stripe_crypto | pix_auto | pix_manual | crypto | crypto_sub */
    provider: text('provider').notNull(),
    /** Stripe Price id when provider = stripe (recurring subscription) */
    stripePriceId: text('stripe_price_id'),
    /** BoomFi plan id when provider = crypto_sub */
    boomfiPlanId: text('boomfi_plan_id'),
    active: boolean('active')
      .$defaultFn(() => true)
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('vip_plan_price_plan_idx').on(t.planId),
    uniqueIndex('vip_plan_price_plan_currency_provider_idx').on(t.planId, t.currency, t.provider),
  ],
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
    /** Which rail processed this: 'stripe' | 'boomfi' */
    provider: text('provider').notNull(),
    /** Stripe Subscription id, e.g. "sub_..." (stripe rail) */
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    /** Stripe Customer id, e.g. "cus_..." (stripe rail) */
    stripeCustomerId: text('stripe_customer_id'),
    /** BoomFi subscription id (crypto rail) */
    boomfiSubscriptionId: text('boomfi_subscription_id').unique(),
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

// ─── Payments — one row per confirmed charge (source of truth for revenue) ───
// Written by payment-provider webhooks (Stripe `invoice.paid`, etc). This is
// the only place revenue is persisted — vip_subscription only tracks current
// access state, not payment history. Used to build the dashboard's revenue
// chart, transactions table and per-source breakdown.

export const payment = pgTable(
  'payment',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Null when the charge isn't tied to a VIP plan (e.g. one-off checkout) */
    vipSubscriptionId: text('vip_subscription_id').references(() => vipSubscription.id, {
      onDelete: 'set null',
    }),
    /** Fan email, when available from the payment provider */
    fanEmail: text('fan_email'),
    /** Payment rail: 'stripe' | 'boomfi' | 'pix_manual' */
    provider: text('provider').notNull(),
    /** Human label for the source column, e.g. "Telegram · Plano VIP", "OnlyFans" */
    source: text('source').notNull(),
    /** Stripe Invoice id — unique, used for webhook idempotency (stripe rail) */
    stripeInvoiceId: text('stripe_invoice_id').unique(),
    /** BoomFi payment id — unique, used for webhook idempotency (crypto rail) */
    boomfiPaymentId: text('boomfi_payment_id').unique(),
    /** ISO 4217 lowercase, e.g. "brl", "usd" */
    currency: text('currency').notNull(),
    /** Gross amount charged, in the smallest currency unit (centavos / cents) */
    grossCents: integer('gross_cents').notNull(),
    /** Payment-provider processing fee (Stripe fee, etc), smallest unit */
    providerFeeCents: integer('provider_fee_cents')
      .$defaultFn(() => 0)
      .notNull(),
    /** FX/conversion fee (Swift/IOF on cross-currency settlement), smallest unit */
    fxFeeCents: integer('fx_fee_cents')
      .$defaultFn(() => 0)
      .notNull(),
    /** 'paid' | 'refunded' | 'failed' */
    status: text('status')
      .$defaultFn(() => 'paid')
      .notNull(),
    /**
     * Manual payout tracking for the crypto rail — 'boomfi' payments settle
     * to the platform's own settlement accounts (no automatic per-creator
     * split, see creatorCryptoCoin), so the creator's share is paid out
     * off-platform and marked here once done. Irrelevant for other rails.
     * 'pending' | 'paid_out'
     */
    creatorPayoutStatus: text('creator_payout_status')
      .$defaultFn(() => 'pending')
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('payment_creator_created_idx').on(t.creatorId, t.createdAt),
    index('payment_vip_subscription_idx').on(t.vipSubscriptionId),
  ],
)

// ─── PPV content — pay-per-view media sold in a creator's Telegram channel ───
// A blurred/low-res preview is posted publicly in the channel as a teaser
// (with an inline "Unlock" button); the full media is only ever sent in a
// private 1:1 chat with the fan after payment — Telegram has no concept of
// unlocking a single channel post for one viewer, so the private DM is the
// actual delivery mechanism (see ppvPurchase).

export const ppvContent = pgTable(
  'ppv_content',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    title: text('title'),
    /** Amount in the smallest currency unit (centavos / cents) */
    priceCents: integer('price_cents').notNull(),
    /** ISO 4217 lowercase, e.g. "usd" */
    currency: text('currency').notNull(),
    /** 'photo' | 'video' */
    mediaType: text('media_type').notNull(),
    /** Telegram file_id of the blurred/teaser version, posted in the channel */
    previewFileId: text('preview_file_id').notNull(),
    /** GCS URL of the original, full-resolution file — never posted publicly */
    fullFileUrl: text('full_file_url').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index('ppv_content_creator_idx').on(t.creatorId)],
)

// ─── PPV purchases — one row per fan unlock attempt/purchase ─────────────────

export const ppvPurchase = pgTable(
  'ppv_purchase',
  {
    id: text('id').primaryKey(),
    ppvContentId: text('ppv_content_id')
      .notNull()
      .references(() => ppvContent.id, { onDelete: 'cascade' }),
    creatorId: text('creator_id')
      .notNull()
      .references(() => creator.id, { onDelete: 'cascade' }),
    /** Telegram user id of the fan who tapped "Unlock" — delivery target for the full media */
    telegramUserId: text('telegram_user_id').notNull(),
    /** BoomFi payment id — unique, used for webhook idempotency */
    boomfiPaymentId: text('boomfi_payment_id').unique(),
    /** 'pending' | 'paid' */
    status: text('status')
      .$defaultFn(() => 'pending')
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('ppv_purchase_content_idx').on(t.ppvContentId),
    index('ppv_purchase_fan_idx').on(t.telegramUserId),
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

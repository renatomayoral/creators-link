import { platform, creator, creatorLink, linkClick, vipPlan, vipSubscription } from './creators'
import { pgTable, text, timestamp, boolean, integer, date, uniqueIndex } from 'drizzle-orm/pg-core'

// ─── Better Auth core tables ───────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
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
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
})

// ─── Stripe subscription table (used by @better-auth/stripe plugin) ─────────

export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull().default('free'),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  seats: text('seats'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})

// ─── User profile — extra metadata not managed by Better Auth ────────────────

export const userProfile = pgTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** One-time welcome video perk for free accounts */
  welcomeVideoUsed: boolean('welcome_video_used').$defaultFn(() => false).notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})

// ─── Daily usage quota per authenticated user ─────────────────────────────────
// One row per (user, date). Resets automatically each new day via date key.

export const usageQuota = pgTable(
  'usage_quota',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** ISO date string YYYY-MM-DD — natural daily reset key */
    date: date('date').notNull(),
    /** Fast-queue image generations used today */
    imagesFast: integer('images_fast').$defaultFn(() => 0).notNull(),
    /** Slow-queue image generations used today (for stats only, no hard cap) */
    imagesSlow: integer('images_slow').$defaultFn(() => 0).notNull(),
    /** Fast-queue video generations used today */
    videosFast: integer('videos_fast').$defaultFn(() => 0).notNull(),
    /** Slow-queue video generations used today */
    videosSlow: integer('videos_slow').$defaultFn(() => 0).notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
  },
  (t) => [uniqueIndex('usage_quota_user_date_idx').on(t.userId, t.date)],
)

// ─── Anonymous session quota — IP/fingerprint-based ──────────────────────────
// Tracks usage for unauthenticated visitors. Keyed by fingerprint hash.

export const anonymousSession = pgTable('anonymous_session', {
  id: text('id').primaryKey(),
  /**
   * SHA-256 hex of (anon_id cookie + IP address).
   * Using both prevents trivial abuse via cookie deletion.
   */
  fingerprint: text('fingerprint').notNull().unique(),
  /** ISO date string YYYY-MM-DD for daily reset */
  date: date('date').notNull(),
  /** Images generated today */
  imagesCount: integer('images_count').$defaultFn(() => 0).notNull(),
  /** Whether the one-time welcome video has been consumed */
  welcomeVideoUsed: boolean('welcome_video_used').$defaultFn(() => false).notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})

// ─── Schema export ────────────────────────────────────────────────────────────

export const schema = {
  platform,
  creator,
  creatorLink,
  linkClick,
  vipPlan,
  vipSubscription,
  user,
  session,
  account,
  verification,
  subscription,
  userProfile,
  usageQuota,
  anonymousSession,
}

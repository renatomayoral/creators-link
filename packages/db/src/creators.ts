import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

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
    sortOrder: integer('sort_order').$defaultFn(() => 0).notNull(),
    active: boolean('active').$defaultFn(() => true).notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
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
    accentColor: text('accent_color').$defaultFn(() => '#ec4899').notNull(),
    /** 'live' | 'draft' */
    status: text('status').$defaultFn(() => 'draft').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
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
    sortOrder: integer('sort_order').$defaultFn(() => 0).notNull(),
    active: boolean('active').$defaultFn(() => true).notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
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
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  },
  (t) => [
    index('link_click_creator_created_idx').on(t.creatorId, t.createdAt),
    index('link_click_link_idx').on(t.linkId),
  ],
)

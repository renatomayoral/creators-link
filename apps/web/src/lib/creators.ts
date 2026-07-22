// Shared constants, types and helpers for the Creators feature.
// Platform colours match the public link-in-bio page (neon brand palette).

export const PLATFORMS = {
  onlyfans: { label: 'OnlyFans', color: '#ec4899', baseUrl: 'https://onlyfans.com/' },
  fanvue: { label: 'Fanvue', color: '#6d5dfc', baseUrl: 'https://fanvue.com/' },
  privacy: { label: 'Privacy', color: '#ff5a5f', baseUrl: 'https://privacy.com.br/' },
  instagram: { label: 'Instagram', color: '#dd2a7b', baseUrl: 'https://instagram.com/' },
  tiktok: { label: 'TikTok', color: '#38bdf8', baseUrl: 'https://tiktok.com/@' },
} as const

export type Platform = keyof typeof PLATFORMS

export const PLATFORM_KEYS = Object.keys(PLATFORMS) as Platform[]

export function platformMeta(platform: string) {
  return PLATFORMS[platform as Platform] ?? { label: platform, color: '#64748b', baseUrl: '' }
}

/** "Babi Barelli" → "babi-barelli" (accent-stripped, url-safe) */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── API response shapes (client ↔ server contract) ──────────────────────────

export type CreatorListRow = {
  id: string
  name: string
  handle: string | null
  slug: string
  avatarUrl: string | null
  customDomain: string | null
  status: 'live' | 'draft'
  clicks30d: number
  /** % change vs. the previous 30-day window */
  change: number
  topLink: { platform: string; label: string; color: string } | null
  /** 12 daily buckets, normalised 0–100, for the sparkline */
  trend: number[]
}

export type CreatorLinkStat = {
  id: string
  platform: string
  label: string
  url: string
  color: string
  clicks: number
  /** share of total clicks, 0–100 */
  pct: number
  /** width relative to the top link, 0–100 */
  barPct: number
}

export type ConnectedPlatform = {
  platform: string
  handle: string | null
  platformUserId: string | null
  expired: boolean
}

export type CreatorDetail = {
  id: string
  name: string
  handle: string | null
  slug: string
  bio: string | null
  avatarUrl: string | null
  accentColor: string
  customDomain: string | null
  stripeOnboarded: boolean
  stripePayoutMode: 'own' | 'centralized'
  payoutHubCreatorId: string | null
  pixKey: string | null
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null
  acceptedPayments: string[]
  status: 'live' | 'draft'
  totalClicks30d: number
  /** 14 daily click counts (oldest → today) */
  daily: number[]
  links: CreatorLinkStat[]
  /** platform connection status — avoids N separate fetches on mount */
  platformConnections: ConnectedPlatform[]
}

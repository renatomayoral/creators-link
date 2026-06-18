import { buildOfHeaders } from './headers.js'
import type { OfSession, OfProfile, OfEarningsSummary, OfSubscriberStats, OfStats } from './types.js'

const OF_BASE = 'https://onlyfans.com'
const API_V2 = `${OF_BASE}/api2/v2`

// ─── OnlyFans API client ──────────────────────────────────────────────────────
// Uses the OF internal API (same endpoints the web app calls), authenticated
// via exported browser session cookies. No Playwright — pure HTTP fetch.

export type RefreshResult =
  | { refreshed: false }
  | { refreshed: true; newCookieStr: string }

export class OnlyFansClient {
  constructor(private session: OfSession) {}

  // Low-level GET — builds auth headers and calls the internal API
  private async get<T>(path: string): Promise<T> {
    const { body } = await this.getRaw<T>(path)
    return body
  }

  private async getRaw<T>(path: string): Promise<{ body: T; res: Response }> {
    const headers = buildOfHeaders(path, this.session.userId, this.session.cookieStr)
    const res = await fetch(`${OF_BASE}${path}`, { headers })

    if (res.status === 401 || res.status === 403) {
      throw new OfAuthError(`Session expired or invalid (${res.status}). Re-export cookies.`)
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OnlyFans API error ${res.status} on ${path}: ${text.slice(0, 200)}`)
    }
    const body = await res.json() as T
    return { body, res }
  }

  // Attempt to silently refresh the session by making a lightweight request
  // and capturing any new cookies the OF server sends back in Set-Cookie.
  // Returns the updated cookie string if the server issued new cookies,
  // or { refreshed: false } if nothing changed (session still valid as-is).
  async tryRefreshSession(): Promise<RefreshResult> {
    const headers = buildOfHeaders('/api2/v2/users/me', this.session.userId, this.session.cookieStr)
    const res = await fetch(`${OF_BASE}/api2/v2/users/me`, { headers })

    if (res.status === 401 || res.status === 403) {
      throw new OfAuthError('Session expired — user must reconnect via bookmarklet.')
    }
    if (!res.ok) return { refreshed: false }

    // Parse Set-Cookie headers and merge with existing cookies
    const newCookies = extractSetCookies(res)
    if (newCookies.size === 0) return { refreshed: false }

    const merged = mergeCookies(this.session.cookieStr, newCookies)
    if (merged === this.session.cookieStr) return { refreshed: false }

    return { refreshed: true, newCookieStr: merged }
  }

  // GET /api2/v2/users/me — own profile + counts
  async getProfile(): Promise<OfProfile> {
    const raw = await this.get<Record<string, unknown>>('/api2/v2/users/me')
    return mapProfile(raw)
  }

  // GET /api2/v2/earnings/summary — earnings breakdown
  async getEarnings(): Promise<OfEarningsSummary> {
    const raw = await this.get<Record<string, unknown>>('/api2/v2/earnings/summary')
    return mapEarnings(raw)
  }

  // GET /api2/v2/subscriptions/subscribers?type=active&limit=0 — subscriber counts
  async getSubscriberStats(): Promise<OfSubscriberStats> {
    const [active, expired] = await Promise.all([
      this.get<{ list: unknown[]; counters?: { usersCount?: number } }>(
        '/api2/v2/subscriptions/subscribers?type=active&limit=0',
      ),
      this.get<{ list: unknown[]; counters?: { usersCount?: number } }>(
        '/api2/v2/subscriptions/subscribers?type=expired&limit=0',
      ),
    ])

    // 30-day new/churned: derived from sorted subscriber list (approximate)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const activeList = await this.get<{ list: Array<{ subscribeAt?: string }> }>(
      '/api2/v2/subscriptions/subscribers?type=active&limit=50&sortOrder=recent',
    )
    const new30d = activeList.list.filter(
      (s) => s.subscribeAt && new Date(s.subscribeAt).getTime() > thirtyDaysAgo,
    ).length

    return {
      total: (active.counters?.usersCount ?? 0) + (expired.counters?.usersCount ?? 0),
      active: active.counters?.usersCount ?? 0,
      expired: expired.counters?.usersCount ?? 0,
      new30d,
      churned30d: 0, // requires full list scan — omitted for performance
    }
  }

  // Convenience: fetch all stats in one call
  async getAllStats(): Promise<OfStats> {
    const [profile, earnings, subscribers] = await Promise.all([
      this.getProfile(),
      this.getEarnings(),
      this.getSubscriberStats(),
    ])
    return { profile, earnings, subscribers, fetchedAt: new Date() }
  }

  // Verify the session is valid (fast ping via /users/me)
  async ping(): Promise<boolean> {
    try {
      await this.getProfile()
      return true
    } catch (e) {
      if (e instanceof OfAuthError) return false
      throw e
    }
  }
}

export class OfAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfAuthError'
  }
}

// ─── Response mappers ─────────────────────────────────────────────────────────

function mapProfile(r: Record<string, unknown>): OfProfile {
  return {
    id: r['id'] as number,
    name: (r['name'] as string) ?? '',
    username: (r['username'] as string) ?? '',
    about: (r['about'] as string) ?? '',
    joinDate: (r['joinDate'] as string) ?? '',
    avatar: (r['avatar'] as string | null) ?? null,
    header: (r['header'] as string | null) ?? null,
    subscribersCount: (r['subscribersCount'] as number) ?? 0,
    likesCount: (r['likesCount'] as number) ?? 0,
    favoritesCount: (r['favoritesCount'] as number) ?? 0,
    photosCount: (r['photosCount'] as number) ?? 0,
    videosCount: (r['videosCount'] as number) ?? 0,
    postsCount: (r['postsCount'] as number) ?? 0,
    isVerified: (r['isVerified'] as boolean) ?? false,
    isPerformer: (r['isPerformer'] as boolean) ?? false,
  }
}

function mapEarnings(r: Record<string, unknown>): OfEarningsSummary {
  const chart = (r['chartAmount'] as Record<string, number>) ?? {}
  const balance = (r['currentBalance'] as number) ?? 0

  // OF returns gross amounts in USD cents or full dollars depending on version
  // normalise to cents
  const cents = (v: number) => (v > 0 && v < 100 ? Math.round(v * 100) : v)

  const subscriptions = cents(chart['subscriptions'] ?? chart['subsAmount'] ?? 0)
  const tips = cents(chart['tips'] ?? chart['tipsAmount'] ?? 0)
  const messages = cents(chart['messages'] ?? chart['messagesAmount'] ?? 0)
  const posts = cents(chart['posts'] ?? chart['postsAmount'] ?? 0)
  const referrals = cents(chart['referrals'] ?? chart['refAmount'] ?? 0)
  const other = cents(chart['other'] ?? 0)

  const totalGross = subscriptions + tips + messages + posts + referrals + other

  return {
    totalGross,
    totalNet: Math.round(totalGross * 0.8),
    byType: { subscriptions, tips, messages, posts, referrals, other },
    currentBalance: cents(balance),
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

// Parse all Set-Cookie headers from a response into a name→value map.
// fetch() collapses multiple Set-Cookie into one header joined by commas in
// some runtimes — we handle both forms.
function extractSetCookies(res: Response): Map<string, string> {
  const map = new Map<string, string>()
  // getSetCookie() is available in Node 18+ / undici
  const raw: string[] =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : res.headers.get('set-cookie')?.split(/,(?=[^;]+=[^;]+)/) ?? []

  for (const entry of raw) {
    const part = entry.split(';')[0]!.trim()
    const idx = part.indexOf('=')
    if (idx < 0) continue
    map.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim())
  }
  return map
}

// Merge new cookies from Set-Cookie into the existing cookie string.
// Existing cookies keep their values unless overridden by a new one.
function mergeCookies(existing: string, updates: Map<string, string>): string {
  const pairs = new Map<string, string>()

  for (const part of existing.split(/;\s*/)) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    pairs.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim())
  }

  for (const [k, v] of updates) {
    pairs.set(k, v)
  }

  return Array.from(pairs.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

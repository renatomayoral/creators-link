import { buildOfHeaders } from './headers.js'
import type { OfSession, OfProfile, OfEarningsSummary, OfSubscriberStats, OfStats } from './types.js'

const OF_BASE = 'https://onlyfans.com'
const API_V2 = `${OF_BASE}/api2/v2`

// ─── OnlyFans API client ──────────────────────────────────────────────────────
// Uses the OF internal API (same endpoints the web app calls), authenticated
// via exported browser session cookies. No Playwright — pure HTTP fetch.

export class OnlyFansClient {
  constructor(private session: OfSession) {}

  // Low-level GET — builds auth headers and calls the internal API
  private async get<T>(path: string): Promise<T> {
    const headers = buildOfHeaders(path, this.session.userId, this.session.cookieStr)
    const res = await fetch(`${OF_BASE}${path}`, { headers })

    if (res.status === 401 || res.status === 403) {
      throw new OfAuthError(`Session expired or invalid (${res.status}). Re-export cookies.`)
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OnlyFans API error ${res.status} on ${path}: ${body.slice(0, 200)}`)
    }
    return res.json() as Promise<T>
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

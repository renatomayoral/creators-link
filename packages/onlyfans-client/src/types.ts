// ─── Cookie session — what the creator pastes/exports from their browser ──────

export type OfSession = {
  /** Raw cookie string: "sess=xxx; fp=yyy; ..." */
  cookieStr: string
  /** Numeric user id extracted from the sess cookie or profile page */
  userId: string
  /** Optional: which browser user-agent to mimic (defaults to Chrome 120) */
  userAgent?: string
}

// ─── API response shapes ───────────────────────────────────────────────────────

export type OfProfile = {
  id: number
  name: string
  username: string
  about: string
  joinDate: string
  avatar: string | null
  header: string | null
  subscribersCount: number
  likesCount: number
  favoritesCount: number
  photosCount: number
  videosCount: number
  postsCount: number
  isVerified: boolean
  isPerformer: boolean
}

export type OfEarningsSummary = {
  /** Total gross earnings (USD cents) */
  totalGross: number
  /** Net after OF's cut (80% of gross) */
  totalNet: number
  /** Breakdown by type */
  byType: {
    subscriptions: number
    tips: number
    messages: number
    posts: number
    referrals: number
    other: number
  }
  /** Current balance available for payout */
  currentBalance: number
}

export type OfSubscriberStats = {
  total: number
  active: number
  expired: number
  new30d: number
  churned30d: number
}

export type OfStats = {
  profile: OfProfile
  earnings: OfEarningsSummary
  subscribers: OfSubscriberStats
  fetchedAt: Date
}

import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { newId } from './ids'

const { rateLimit } = schema

const WINDOW_SECONDS = 60

export type RateLimitResult = { allowed: boolean; retryAfter: number }

/**
 * Fixed-window rate limiter backed by Postgres. `key` should encode both the
 * caller identity and the route being protected (e.g. `apikey:{merchantId}:plans`,
 * `ip:{address}:checkout`) so different routes don't share one bucket.
 */
export async function checkRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000)

  const existing = await db.query.rateLimit.findFirst({
    where: and(eq(rateLimit.key, key), eq(rateLimit.windowStart, windowStart)),
  })

  if (!existing) {
    await db
      .insert(rateLimit)
      .values({ id: newId('rl'), key, windowStart, count: 1 })
      .onConflictDoNothing({ target: [rateLimit.key, rateLimit.windowStart] })
    return { allowed: true, retryAfter: 0 }
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((windowStart.getTime() + WINDOW_SECONDS * 1000 - now.getTime()) / 1000)
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) }
  }

  await db
    .update(rateLimit)
    .set({ count: existing.count + 1 })
    .where(and(eq(rateLimit.key, key), eq(rateLimit.windowStart, windowStart)))
  return { allowed: true, retryAfter: 0 }
}

/** Returns a 429 response if the limit was hit, or null when the caller may proceed. */
export function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (result.allowed) return null
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(result.retryAfter) } })
}

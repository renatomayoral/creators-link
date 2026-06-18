import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@repo/db'
import { eq, and } from 'drizzle-orm'
import { OnlyFansClient, OfAuthError } from '@repo/onlyfans-client'

const { platformToken } = schema

// GET /api/onlyfans/refresh-sessions
// Called daily by GCP Cloud Scheduler (or any HTTP cron).
// Protected by CRON_SECRET — set the same value in Cloud Scheduler header.
//
// For each connected OnlyFans session:
//   1. Makes a lightweight request to OF with current cookies
//   2. If OF responds with Set-Cookie, saves the updated cookies
//   3. If session is expired, marks it so the UI shows the reconnect prompt
//
// Cloud Scheduler config:
//   URL:    https://yourdomain.com/api/onlyfans/refresh-sessions
//   Method: GET
//   Header: Authorization: Bearer <CRON_SECRET>
//   Schedule: 0 4 * * *  (daily at 4am UTC)

export async function GET(req: NextRequest) {
  // Auth: must have CRON_SECRET in Authorization header
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all active OnlyFans platform tokens
  const tokens = await db
    .select()
    .from(platformToken)
    .where(eq(platformToken.platform, 'onlyfans'))

  const results = {
    total: tokens.length,
    refreshed: 0,
    unchanged: 0,
    expired: 0,
    errors: 0,
  }

  // Process sequentially to avoid hammering OF with concurrent requests
  for (const token of tokens) {
    if (!token.apiToken) {
      results.errors++
      continue
    }

    const client = new OnlyFansClient({
      cookieStr: token.apiToken,
      userId: token.accessToken,
    })

    try {
      const result = await client.tryRefreshSession()

      if (result.refreshed) {
        await db
          .update(platformToken)
          .set({ apiToken: result.newCookieStr, updatedAt: new Date() })
          .where(eq(platformToken.id, token.id))
        results.refreshed++
      } else {
        results.unchanged++
      }
    } catch (e) {
      if (e instanceof OfAuthError) {
        // Mark session as expired so the UI shows the reconnect prompt
        await db
          .update(platformToken)
          .set({
            // Clear accessToken as sentinel for "expired" — UI checks this
            expiresAt: new Date(0),
            updatedAt: new Date(),
          })
          .where(eq(platformToken.id, token.id))
        results.expired++
      } else {
        console.error(`OF session refresh error for token ${token.id}:`, e)
        results.errors++
      }
    }

    // Small delay between requests to avoid rate limiting
    await sleep(800)
  }

  return NextResponse.json({ ok: true, ...results, ranAt: new Date().toISOString() })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

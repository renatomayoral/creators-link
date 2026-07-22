import { NextRequest, NextResponse } from 'next/server'
import { and, lte, or, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { runChargeCycle } from '@/lib/cycle'
import { retryDueWebhookDeliveries } from '@/lib/webhooks'
import { env } from '@/env'

const { subscription } = schema

// GraceDays: how long a past_due subscription is retried before we give up
// and mark it canceled.
const GRACE_DAYS = 7
const BATCH_SIZE = 200

// GET /api/cron/charge-due — Authorization: Bearer <CRON_SECRET>.
// Finds subscriptions due for billing, runs their on-chain charge cycle
// (serialized per chain to avoid operator nonce races), then sweeps webhook
// retries. Intended to be invoked by GCP Cloud Scheduler.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${env.cronSecret}`
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const due = await db.query.subscription.findMany({
    where: and(
      or(eq(subscription.status, 'active'), eq(subscription.status, 'past_due')),
      lte(subscription.currentPeriodEnd, now),
    ),
    limit: BATCH_SIZE,
  })

  // Group by chain and process each chain's subscriptions sequentially, to
  // avoid the operator wallet issuing overlapping transactions (nonce races)
  // on the same chain. Different chains run independently in parallel.
  const byChain = new Map<number, typeof due>()
  for (const sub of due) {
    const list = byChain.get(sub.chainId) ?? []
    list.push(sub)
    byChain.set(sub.chainId, list)
  }

  let settled = 0
  let failed = 0

  await Promise.all(
    Array.from(byChain.values()).map(async (subs) => {
      for (const sub of subs) {
        try {
          const result = await runChargeCycle(sub)
          if (result.outcome === 'settled') settled++
          if (result.outcome === 'failed') failed++
        } catch (err) {
          console.error('[splitfy cron] charge cycle threw:', err)
          failed++
        }
      }
    }),
  )

  // Give up on subscriptions that have been past_due beyond the grace window.
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  const overdue = await db.query.subscription.findMany({
    where: and(eq(subscription.status, 'past_due'), lte(subscription.currentPeriodEnd, graceCutoff)),
  })
  for (const sub of overdue) {
    await db.update(subscription).set({ status: 'canceled', updatedAt: new Date() }).where(eq(subscription.id, sub.id))
  }

  const { retried } = await retryDueWebhookDeliveries()

  return NextResponse.json({
    processed: due.length,
    settled,
    failed,
    canceledForGrace: overdue.length,
    retriedWebhooks: retried,
  })
}

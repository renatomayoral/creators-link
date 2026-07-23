import { NextRequest, NextResponse } from 'next/server'
import { and, lte, or, eq, isNotNull } from 'drizzle-orm'
import { db, schema } from '@/db'
import { runChargeCycle } from '@/lib/cycle'
import { retryDueWebhookDeliveries } from '@/lib/webhooks'
import { readOperatorNativeBalance } from '@/lib/onchain'
import { env } from '@/env'

const { subscription, charge } = schema

// GraceDays: how long a past_due subscription is retried before we give up
// and mark it canceled.
const GRACE_DAYS = 7
const BATCH_SIZE = 200

// Minimum native gas balance the operator wallet should hold per chain before
// we flag it as running low — rough guardrail, not chain-specific gas pricing.
const MIN_OPERATOR_GAS_WEI = 10_000_000_000_000_000n // 0.01 ETH-equivalent

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
          console.error('[tidepay cron] charge cycle threw:', err)
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

  // Reconciliation: charges where the pull succeeded but a later transfer leg
  // failed. Funds are sitting in the operator wallet across every merchant —
  // surface it in the cron response and log it so it isn't silently missed.
  const stuckCharges = await db.query.charge.findMany({
    where: and(eq(charge.status, 'pulled'), isNotNull(charge.failureReason)),
  })
  if (stuckCharges.length > 0) {
    console.error(`[tidepay cron] ${stuckCharges.length} charge(s) stuck after pull, needing manual reconciliation`)
  }

  // Gas monitoring: check the operator's native balance on every chain that
  // had at least one charge processed this run.
  const lowGasChains: number[] = []
  for (const chainId of byChain.keys()) {
    try {
      const balance = await readOperatorNativeBalance(chainId)
      if (balance < MIN_OPERATOR_GAS_WEI) {
        lowGasChains.push(chainId)
        console.error(`[tidepay cron] operator gas low on chain ${chainId}: ${balance.toString()} wei`)
      }
    } catch (err) {
      console.error(`[tidepay cron] failed to read operator gas balance on chain ${chainId}:`, err)
    }
  }

  return NextResponse.json({
    processed: due.length,
    settled,
    failed,
    canceledForGrace: overdue.length,
    retriedWebhooks: retried,
    stuckCharges: stuckCharges.length,
    lowGasChains,
  })
}

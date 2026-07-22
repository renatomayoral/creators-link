import { parseUnits } from 'viem'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { newId } from './ids'
import { getToken } from './crypto-coins'
import { readAllowance, readBalance, pullFromSubscriber, transferFromOperator } from './onchain'
import { getOperatorAddress } from './operator'
import { sendWebhook } from './webhooks'

const { subscription, plan, charge, merchant } = schema

type SubscriptionRow = typeof subscription.$inferSelect

const BPS_DENOMINATOR = 10000n

function takeRateBps(takeRatePct: string): bigint {
  // takeRatePct is a decimal string like "2.50" (percent). Convert to bps
  // (1% = 100bps) via integer math on the string to avoid float error.
  const [whole, frac = ''] = takeRatePct.split('.')
  const fracPadded = (frac + '00').slice(0, 2) // 2 decimal places of percent precision
  const percentHundredths = BigInt(whole || '0') * 100n + BigInt(fracPadded || '0')
  return percentHundredths // e.g. "2.50" -> 250 bps
}

/**
 * Runs one billing cycle for a subscription: pulls the gross amount from the
 * subscriber, then forwards the merchant's share and the platform's take-rate
 * share. Idempotent and resumable — safe to call more than once for the same
 * period; on-chain legs already recorded are never repeated.
 */
export async function runChargeCycle(sub: SubscriptionRow): Promise<{ outcome: 'settled' | 'failed' | 'skipped' }> {
  const foundPlan = await db.query.plan.findFirst({ where: eq(plan.id, sub.planId) })
  if (!foundPlan) return { outcome: 'skipped' }

  const foundMerchant = await db.query.merchant.findFirst({ where: eq(merchant.id, sub.merchantId) })
  if (!foundMerchant) return { outcome: 'skipped' }

  const token = getToken(foundPlan.tokenKey)
  if (!token) return { outcome: 'skipped' }

  if (!sub.subscriberWallet) return { outcome: 'skipped' } // not connected yet

  const periodStart = sub.currentPeriodEnd ?? sub.createdAt
  const periodStartEpoch = Math.floor(periodStart.getTime() / 1000)
  const idempotencyKey = `${sub.id}:${periodStartEpoch}`

  // Step 1: idempotency guard — insert or resume the existing charge row.
  let chargeRow = await db.query.charge.findFirst({ where: eq(charge.idempotencyKey, idempotencyKey) })

  if (!chargeRow) {
    const gross = parseUnits(foundPlan.amount, token.decimals)
    const bps = takeRateBps(foundMerchant.takeRatePct)
    const platformAmount = (gross * bps) / BPS_DENOMINATOR
    const merchantAmount = gross - platformAmount // remainder favors the merchant

    const inserted = await db
      .insert(charge)
      .values({
        id: newId('chg'),
        subscriptionId: sub.id,
        merchantId: sub.merchantId,
        idempotencyKey,
        grossAmount: gross.toString(),
        platformAmount: platformAmount.toString(),
        merchantAmount: merchantAmount.toString(),
        tokenKey: foundPlan.tokenKey,
        chainId: foundPlan.chainId,
      })
      .onConflictDoNothing({ target: charge.idempotencyKey })
      .returning()

    chargeRow = inserted[0] ?? (await db.query.charge.findFirst({ where: eq(charge.idempotencyKey, idempotencyKey) }))
  }
  if (!chargeRow) return { outcome: 'skipped' }
  if (chargeRow.status === 'settled') return { outcome: 'settled' } // already done, nothing to do
  if (chargeRow.status === 'failed') return { outcome: 'failed' }

  const subscriberWallet = sub.subscriberWallet as `0x${string}`
  const gross = BigInt(chargeRow.grossAmount)
  const merchantAmount = BigInt(chargeRow.merchantAmount)
  const platformAmount = BigInt(chargeRow.platformAmount)

  // Step 2: pre-flight reads (only needed before the pull leg has succeeded).
  if (chargeRow.status === 'pending') {
    const [allowance, balance] = await Promise.all([
      readAllowance(foundPlan.chainId, token.address, subscriberWallet),
      readBalance(foundPlan.chainId, token.address, subscriberWallet),
    ])

    if (allowance < gross) {
      await failCharge(chargeRow.id, sub.id, 'insufficient_allowance')
      await sendWebhook(sub.merchantId, 'payment.failed', { subscriptionId: sub.id, chargeId: chargeRow.id, reason: 'insufficient_allowance' })
      return { outcome: 'failed' }
    }
    if (balance < gross) {
      await failCharge(chargeRow.id, sub.id, 'insufficient_balance')
      await sendWebhook(sub.merchantId, 'payment.failed', { subscriptionId: sub.id, chargeId: chargeRow.id, reason: 'insufficient_balance' })
      return { outcome: 'failed' }
    }

    // Leg 1 — pull gross from subscriber into the operator wallet.
    const pull = await pullFromSubscriber(foundPlan.chainId, token.address, subscriberWallet, gross)
    if (pull.reverted) {
      await failCharge(chargeRow.id, sub.id, 'pull_reverted')
      await sendWebhook(sub.merchantId, 'payment.failed', { subscriptionId: sub.id, chargeId: chargeRow.id, reason: 'pull_reverted' })
      return { outcome: 'failed' }
    }
    await db.update(charge).set({ status: 'pulled', pullTxHash: pull.hash, updatedAt: new Date() }).where(eq(charge.id, chargeRow.id))
    chargeRow = { ...chargeRow, status: 'pulled', pullTxHash: pull.hash }
  }

  // Step 3: leg 2 — forward the merchant's share (skip if already done).
  if (!chargeRow.merchantTransferTxHash) {
    const merchantTransfer = await transferFromOperator(
      foundPlan.chainId,
      token.address,
      foundPlan.merchantDestinationWallet as `0x${string}`,
      merchantAmount,
    )
    if (merchantTransfer.reverted) {
      // Funds are stuck in the operator wallet at this point — do NOT re-pull.
      // Leave status at 'pulled' with a failure reason for manual reconciliation.
      await db
        .update(charge)
        .set({ failureReason: 'merchant_transfer_reverted', attempts: chargeRow.attempts + 1, updatedAt: new Date() })
        .where(eq(charge.id, chargeRow.id))
      return { outcome: 'failed' }
    }
    await db
      .update(charge)
      .set({ merchantTransferTxHash: merchantTransfer.hash, updatedAt: new Date() })
      .where(eq(charge.id, chargeRow.id))
    chargeRow = { ...chargeRow, merchantTransferTxHash: merchantTransfer.hash }
  }

  // Step 4: leg 3 — forward the platform's take-rate share (skip if already done, or if zero).
  if (!chargeRow.platformTransferTxHash && platformAmount > 0n) {
    const platformWallet = (foundMerchant.platformWallet ?? getOperatorAddress()) as `0x${string}`
    const platformTransfer = await transferFromOperator(foundPlan.chainId, token.address, platformWallet, platformAmount)
    if (platformTransfer.reverted) {
      await db
        .update(charge)
        .set({ failureReason: 'platform_transfer_reverted', attempts: chargeRow.attempts + 1, updatedAt: new Date() })
        .where(eq(charge.id, chargeRow.id))
      return { outcome: 'failed' }
    }
    await db
      .update(charge)
      .set({ platformTransferTxHash: platformTransfer.hash, updatedAt: new Date() })
      .where(eq(charge.id, chargeRow.id))
  }

  // Step 5: settle.
  await db.update(charge).set({ status: 'settled', updatedAt: new Date() }).where(eq(charge.id, chargeRow.id))

  const newPeriodEnd = new Date(periodStart.getTime() + foundPlan.intervalDay * 24 * 60 * 60 * 1000)
  const wasFirstCharge = sub.status === 'pending'
  await db
    .update(subscription)
    .set({ status: 'active', currentPeriodEnd: newPeriodEnd, allowanceConfirmed: true, updatedAt: new Date() })
    .where(eq(subscription.id, sub.id))

  await sendWebhook(sub.merchantId, 'payment.succeeded', { subscriptionId: sub.id, chargeId: chargeRow.id })
  if (wasFirstCharge) {
    await sendWebhook(sub.merchantId, 'subscription.active', { subscriptionId: sub.id, planId: sub.planId })
  }

  return { outcome: 'settled' }
}

async function failCharge(chargeId: string, subscriptionId: string, reason: string): Promise<void> {
  await db.update(charge).set({ status: 'failed', failureReason: reason, updatedAt: new Date() }).where(eq(charge.id, chargeId))
  await db.update(subscription).set({ status: 'past_due', updatedAt: new Date() }).where(eq(subscription.id, subscriptionId))
}

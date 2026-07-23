import { createHmac } from 'node:crypto'
import { eq, and, lte } from 'drizzle-orm'
import { db, schema } from '@/db'
import { newId } from './ids'

const { webhookDelivery, merchant } = schema

export type WebhookEvent = 'subscription.created' | 'subscription.active' | 'subscription.canceled' | 'payment.succeeded' | 'payment.failed'

type WebhookPayload = {
  id: string
  event: WebhookEvent
  createdAt: string
  data: Record<string, unknown>
}

// Backoff schedule for retrying a failed delivery, in minutes.
const RETRY_MINUTES = [1, 5, 30, 120, 360]
const MAX_ATTEMPTS = RETRY_MINUTES.length + 1

function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

/** Enqueues and attempts immediate delivery of a signed webhook to a merchant. */
export async function sendWebhook(merchantId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const m = await db.query.merchant.findFirst({ where: eq(merchant.id, merchantId) })
  if (!m?.webhookUrl || !m.webhookSecret) return // merchant hasn't configured a webhook yet

  const payload: WebhookPayload = {
    id: newId('evt'),
    event,
    createdAt: new Date().toISOString(),
    data,
  }
  const rawBody = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = sign(m.webhookSecret, timestamp, rawBody)

  const [delivery] = await db
    .insert(webhookDelivery)
    .values({
      id: newId('whd'),
      merchantId,
      event,
      payload: rawBody,
      signature,
    })
    .returning()

  if (delivery) await attemptDelivery(delivery.id, m.webhookUrl, m.webhookSecret, rawBody, signature, timestamp)
}

async function attemptDelivery(
  deliveryId: string,
  webhookUrl: string,
  _webhookSecret: string,
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<void> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-splitfy-timestamp': timestamp,
        'x-splitfy-signature': signature,
      },
      body: rawBody,
    })

    if (res.ok) {
      await db
        .update(webhookDelivery)
        .set({ status: 'delivered', responseStatus: res.status, lastAttemptAt: new Date(), attempts: 1 })
        .where(eq(webhookDelivery.id, deliveryId))
      return
    }
    await scheduleRetry(deliveryId, res.status)
  } catch {
    await scheduleRetry(deliveryId, null)
  }
}

async function scheduleRetry(deliveryId: string, responseStatus: number | null): Promise<void> {
  const existing = await db.query.webhookDelivery.findFirst({ where: eq(webhookDelivery.id, deliveryId) })
  if (!existing) return

  const attempts = existing.attempts + 1
  const giveUp = attempts >= MAX_ATTEMPTS
  const nextRetryMinutes = RETRY_MINUTES[attempts - 1] ?? RETRY_MINUTES[RETRY_MINUTES.length - 1]!

  await db
    .update(webhookDelivery)
    .set({
      status: giveUp ? 'failed' : 'pending',
      attempts,
      responseStatus: responseStatus ?? existing.responseStatus,
      lastAttemptAt: new Date(),
      nextRetryAt: giveUp ? null : new Date(Date.now() + nextRetryMinutes * 60_000),
    })
    .where(eq(webhookDelivery.id, deliveryId))
}

/** Called by the cron sweep to retry deliveries whose backoff window has elapsed. */
export async function retryDueWebhookDeliveries(): Promise<{ retried: number }> {
  const due = await db.query.webhookDelivery.findMany({
    where: and(eq(webhookDelivery.status, 'pending'), lte(webhookDelivery.nextRetryAt, new Date())),
  })

  for (const delivery of due) {
    const m = await db.query.merchant.findFirst({ where: eq(merchant.id, delivery.merchantId) })
    if (!m?.webhookUrl || !m.webhookSecret) continue
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = sign(m.webhookSecret, timestamp, delivery.payload)
    await attemptDelivery(delivery.id, m.webhookUrl, m.webhookSecret, delivery.payload, signature, timestamp)
  }

  return { retried: due.length }
}

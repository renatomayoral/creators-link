import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { sendAccessExpired } from '@/lib/email'

const { vipSubscription, vipPlan, creator } = schema

// Sends the expiry email and logs the pending kick for a vip_subscription
// row. Actually removing the fan from the Telegram channel requires the
// fan's Telegram user_id, which isn't captured anywhere yet — the invite
// link is single-use and time-limited in the meantime, so no new fan can
// join on it after expiry, but an already-joined fan isn't auto-kicked.
export async function revokeTelegramAccessForSubscription(subscriptionId: string): Promise<void> {
  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.id, subscriptionId),
  })
  if (!sub?.fanEmail) return

  const c = await db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) })
  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

  await sendAccessExpired({
    to: sub.fanEmail,
    creatorName: c?.name ?? '',
    planTitle: plan?.title ?? 'VIP',
    renewLink: `${appUrl}/p/${c?.slug ?? ''}`,
  }).catch((err) => console.error('[telegram-access] failed to send expiry email:', err))

  if (c?.telegramChannelId) {
    console.log('[telegram-access] subscription ended — fan should be removed:', sub.fanEmail)
  }
}

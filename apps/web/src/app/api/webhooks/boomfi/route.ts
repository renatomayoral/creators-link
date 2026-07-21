import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { verifyWebhookSignature } from '@/lib/boomfi'
import { sendCryptoAccessGranted, sendAccessExpired } from '@/lib/email'

const { vipSubscription, vipPlan, creator } = schema

type BoomfiEvent = {
  event: string
  data: {
    id: string
    subscription_id?: string
    reference_id?: string
    status?: string
  }
}

// POST /api/webhooks/boomfi
// Handles Subscription.Updated / Subscription.Canceled / Payment.Updated events.
// Signature: https://docs.boomfi.xyz/docs/webhook-signatures (RSA-SHA256 over "timestamp.rawBody").
export async function POST(req: NextRequest) {
  const timestamp = req.headers.get('x-boomfi-timestamp') ?? ''
  const signature = req.headers.get('x-boomfi-signature') ?? ''
  const rawBody = await req.text()

  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: BoomfiEvent
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const boomfiSubId = payload.data.subscription_id ?? payload.data.reference_id ?? ''
  if (!boomfiSubId) return NextResponse.json({ received: true })

  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.boomfiSubscriptionId, boomfiSubId),
  })

  if (!sub) {
    console.warn('[boomfi webhook] subscription not found:', boomfiSubId)
    return NextResponse.json({ received: true })
  }

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
  const c = await db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) })
  const botToken = process.env['TELEGRAM_BOT_TOKEN']

  if (payload.event === 'Payment.Updated' || payload.event === 'Subscription.Updated') {
    const periodEnd = plan
      ? new Date(Date.now() + plan.intervalDay * 86400_000)
      : new Date(Date.now() + 30 * 86400_000)

    await db
      .update(vipSubscription)
      .set({ status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    // Fee split already happened automatically at pay-in time via the
    // creator's BoomFi Virtual Account deposit_splits config (see
    // /api/creators/[id]/crypto/setup) — no manual transfer needed here.

    // Generate one-time Telegram invite link and email it to the fan.
    if (botToken && c?.telegramChannelId && sub.fanEmail) {
      try {
        const expireDate = Math.floor(periodEnd.getTime() / 1000)
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              chat_id: c.telegramChannelId,
              member_limit: 1,
              expire_date: expireDate,
            }),
          },
        )
        const tgData = await tgRes.json()
        const inviteLink = tgData?.result?.invite_link

        if (inviteLink) {
          await sendCryptoAccessGranted({
            to: sub.fanEmail,
            creatorName: c.name,
            planTitle: plan?.title ?? 'VIP',
            inviteLink,
            periodEnd,
          }).catch(err => console.error('[boomfi webhook] failed to send access email:', err))
        }
      } catch (err) {
        console.error('[boomfi webhook] failed to create invite link:', err)
      }
    }
  }

  if (payload.event === 'Subscription.Canceled') {
    await db
      .update(vipSubscription)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    if (sub.fanEmail) {
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
      const renewLink = `${appUrl}/p/${c?.slug ?? ''}`
      await sendAccessExpired({
        to: sub.fanEmail,
        creatorName: c?.name ?? '',
        planTitle: plan?.title ?? 'VIP',
        renewLink,
      }).catch(err => console.error('[boomfi webhook] failed to send expiry email:', err))
    }

    // Remove fan from Telegram channel (requires Telegram user_id stored at join time)
    // TODO: store telegram_user_id on vipSubscription when fan joins via invite link
    if (botToken && c?.telegramChannelId) {
      console.log('[boomfi webhook] Canceled — fan should be removed:', sub.fanEmail)
    }
  }

  return NextResponse.json({ received: true })
}

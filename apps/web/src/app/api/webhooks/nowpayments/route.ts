import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { verifyIpnSignature, transferToCustomer, withdrawFromCustomer } from '@/lib/nowpayments'
import { sendCryptoAccessGranted, sendAccessExpired } from '@/lib/email'

const { vipSubscription, vipPlan, creator } = schema

// POST /api/webhooks/nowpayments
// IPN from NowPayments — called on every payment status change.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-nowpayments-sig') ?? ''
  const rawBody = await req.text()

  if (!verifyIpnSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = String(payload['payment_status'] ?? payload['status'] ?? '')
  const nowSubId = String(payload['subscription_id'] ?? payload['order_id'] ?? '')

  if (!nowSubId) return NextResponse.json({ received: true })

  const sub = await db.query.vipSubscription.findFirst({
    where: eq(vipSubscription.nowpaymentsSubscriptionId, nowSubId),
  })

  if (!sub) {
    console.warn('[nowpayments webhook] subscription not found:', nowSubId)
    return NextResponse.json({ received: true })
  }

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
  const c = await db.query.creator.findFirst({ where: eq(creator.id, sub.creatorId) })
  const botToken = process.env['TELEGRAM_BOT_TOKEN']

  if (status === 'PAID') {
    const periodEnd = plan
      ? new Date(Date.now() + plan.intervalDay * 86400_000)
      : new Date(Date.now() + 30 * 86400_000)

    await db
      .update(vipSubscription)
      .set({ status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    // ── Custody split: transfer creator share after platform fee ─────────────
    if (c?.nowpaymentsCustomerId) {
      const payAmount = Number(payload['pay_amount'] ?? payload['actually_paid'] ?? 0)
      const payCurrency = String(payload['pay_currency'] ?? payload['outcome_currency'] ?? '')

      if (payAmount > 0 && payCurrency) {
        const feePct = Number(c.platformFeePct ?? '10') / 100
        const creatorShare = Number((payAmount * (1 - feePct)).toFixed(8))

        try {
          await transferToCustomer({
            customerId: c.nowpaymentsCustomerId,
            currency: payCurrency,
            amount: creatorShare,
          })

          // Auto-withdraw if enabled and wallet is configured
          if (c.cryptoAutoWithdraw && c.cryptoWithdrawAddress && c.cryptoWithdrawCurrency) {
            await withdrawFromCustomer({
              customerId: c.nowpaymentsCustomerId,
              address: c.cryptoWithdrawAddress,
              currency: c.cryptoWithdrawCurrency,
              amount: creatorShare,
            }).catch(err =>
              console.error('[nowpayments webhook] auto-withdraw failed:', err)
            )
          }
        } catch (err) {
          console.error('[nowpayments webhook] custody split failed:', err)
        }
      }
    }

    // Generate one-time Telegram invite link and email it to the fan
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
          }).catch(err => console.error('[nowpayments webhook] failed to send access email:', err))
        }
      } catch (err) {
        console.error('[nowpayments webhook] failed to create invite link:', err)
      }
    }
  }

  if (status === 'EXPIRED') {
    await db
      .update(vipSubscription)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))

    // Send expiry email and remove fan from Telegram channel
    if (sub.fanEmail) {
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
      const renewLink = `${appUrl}/p/${c?.slug ?? ''}`
      await sendAccessExpired({
        to: sub.fanEmail,
        creatorName: c?.name ?? '',
        planTitle: plan?.title ?? 'VIP',
        renewLink,
      }).catch(err => console.error('[nowpayments webhook] failed to send expiry email:', err))
    }

    // Remove fan from Telegram channel (requires Telegram user_id stored at join time)
    // TODO: store telegram_user_id on vipSubscription when fan joins via invite link
    if (botToken && c?.telegramChannelId) {
      console.log('[nowpayments webhook] EXPIRED — fan should be removed:', sub.fanEmail)
    }
  }

  if (status === 'PARTIALLY_PAID') {
    await db
      .update(vipSubscription)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(vipSubscription.id, sub.id))
  }

  return NextResponse.json({ received: true })
}

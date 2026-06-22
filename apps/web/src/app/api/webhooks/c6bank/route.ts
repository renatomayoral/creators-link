import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '@repo/db'

const { vipPlan, vipPlanPrice, vipSubscription, creator } = schema

// C6 Bank sends a POST with an array of Pix payments when they're confirmed.
// Payload shape (simplified):
// { pix: [{ txid, endToEndId, valor, horario, infoPagador?, chave }] }
//
// We use `txid` to find the pending subscription or fan session and activate it.
// Security: C6 Bank calls this endpoint from their servers with mTLS — we verify
// the shared webhook secret header as an extra layer.

const WEBHOOK_SECRET = process.env['C6_WEBHOOK_SECRET'] ?? ''

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get('x-webhook-secret')
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { pix?: Array<{ txid: string; valor: string; horario: string; endToEndId?: string }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payments = body.pix ?? []

  for (const pix of payments) {
    const { txid, valor, horario } = pix
    if (!txid) continue

    try {
      await handlePixConfirmed({ txid, amountBrl: parseFloat(valor), paidAt: horario })
    } catch (err) {
      console.error(`[webhook/c6bank] failed to process txid=${txid}`, err)
    }
  }

  // C6 expects 200 OK to stop retrying
  return NextResponse.json({ ok: true })
}

async function handlePixConfirmed({
  txid,
  amountBrl,
  paidAt,
}: {
  txid: string
  amountBrl: number
  paidAt: string
}) {
  // Look for a pending subscription with this txid
  const sub = await db.query.vipSubscription.findFirst({
    where: and(
      eq(vipSubscription.provider, 'pix_auto'),
      // txid stored in nowpaymentsSubscriptionId as a temporary field until
      // we have a dedicated pix_txid column — replace with a proper column later
      eq(vipSubscription.nowpaymentsSubscriptionId, txid),
    ),
  })

  if (sub) {
    // Activate subscription: set status active + compute period end
    const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, sub.planId) })
    if (plan) {
      const periodEnd = new Date(paidAt)
      periodEnd.setDate(periodEnd.getDate() + plan.intervalDay)

      await db.update(vipSubscription)
        .set({ status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date() })
        .where(eq(vipSubscription.id, sub.id))

      // Grant Telegram access — generate invite link and send to fan
      await grantTelegramAccess(sub.creatorId, sub.fanEmail ?? undefined)
    }
    return
  }

  // No existing subscription — create one if we can map the txid to a plan
  // (for pix_manual flows where the charge was created on-the-fly)
  console.log(`[webhook/c6bank] no subscription found for txid=${txid}, skipping`)
}

async function grantTelegramAccess(creatorId: string, fanEmail?: string) {
  const botToken = process.env['TELEGRAM_BOT_TOKEN']
  if (!botToken) return

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c?.telegramChannelId) return

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: c.telegramChannelId,
          member_limit: 1,
          creates_join_request: false,
        }),
      },
    )
    const data = await res.json()
    if (data.ok) {
      const inviteLink: string = data.result.invite_link
      console.log(`[telegram] invite for ${fanEmail ?? 'fan'}: ${inviteLink}`)
      // TODO: send invite link to fan via email (implement with your email provider)
    }
  } catch (err) {
    console.error('[telegram] createChatInviteLink failed', err)
  }
}

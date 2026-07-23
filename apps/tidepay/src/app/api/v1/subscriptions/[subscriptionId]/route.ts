import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { authenticateMerchant } from '@/lib/api-key'
import { sendWebhook } from '@/lib/webhooks'

const { subscription, charge } = schema

// GET /api/v1/subscriptions/[subscriptionId] — status + last charge attempt.
export async function GET(req: NextRequest, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscriptionId } = await params
  const found = await db.query.subscription.findFirst({
    where: and(eq(subscription.id, subscriptionId), eq(subscription.merchantId, merchant.id)),
  })
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lastCharge = await db.query.charge.findFirst({
    where: eq(charge.subscriptionId, found.id),
    orderBy: [desc(charge.createdAt)],
  })

  return NextResponse.json({
    id: found.id,
    status: found.status,
    currentPeriodEnd: found.currentPeriodEnd,
    allowanceConfirmed: found.allowanceConfirmed,
    subscriberWallet: found.subscriberWallet,
    lastCharge: lastCharge ?? null,
  })
}

// DELETE /api/v1/subscriptions/[subscriptionId] — cancel a subscription.
// We simply stop pulling; the subscriber may separately revoke their allowance.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscriptionId } = await params
  const found = await db.query.subscription.findFirst({
    where: and(eq(subscription.id, subscriptionId), eq(subscription.merchantId, merchant.id)),
  })
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(subscription).set({ status: 'canceled', updatedAt: new Date() }).where(eq(subscription.id, found.id))

  await sendWebhook(merchant.id, 'subscription.canceled', { subscriptionId: found.id, planId: found.planId })

  return NextResponse.json({ id: found.id, status: 'canceled' })
}

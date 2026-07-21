import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { createCustomer, createPayLink } from '@/lib/boomfi'
import { sendCryptoPaymentLink } from '@/lib/email'

const { vipPlan, vipPlanPrice, vipSubscription, creator } = schema

const bodySchema = z.object({
  planId: z.string(),
  email: z.string().email(),
})

// POST /api/boomfi/subscribe
// Creates a BoomFi customer + a pay link for the first billing cycle of a
// recurring VIP plan. BoomFi generates a new pay link for each subsequent
// cycle via its own reminder flow (see webhooks/boomfi for status updates).
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { planId, email } = parsed.data

  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, planId) })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const cryptoPrice = await db.query.vipPlanPrice.findFirst({
    where: and(
      eq(vipPlanPrice.planId, planId),
      eq(vipPlanPrice.provider, 'crypto_sub'),
    ),
  })

  if (!cryptoPrice?.boomfiPlanId) {
    return NextResponse.json(
      { error: 'Este plano não possui subscription plan configurado no BoomFi.' },
      { status: 400 },
    )
  }

  const c = await db.query.creator.findFirst({ where: eq(creator.id, plan.creatorId) })

  try {
    const customer = await createCustomer({ externalId: `${planId}-${email}`, email })

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    const orderId = `${planId}-${Date.now()}`
    const payLink = await createPayLink({
      amount: cryptoPrice.amountCents / 100,
      currency: cryptoPrice.currency,
      orderId,
      description: `${c?.name ?? ''} — ${plan.title}`,
      redirectUrl: `${appUrl}/p/${c?.slug ?? ''}`,
    })

    await db.insert(vipSubscription).values({
      id: randomUUID(),
      creatorId: plan.creatorId,
      planId,
      fanEmail: email,
      provider: 'boomfi',
      boomfiSubscriptionId: payLink.id,
      status: 'pending',
      currentPeriodEnd: null,
    })

    await sendCryptoPaymentLink({
      to: email,
      creatorName: c?.name ?? '',
      planTitle: plan.title,
      paymentLink: payLink.url,
    }).catch(err => console.error('[subscribe] failed to send email:', err))

    return NextResponse.json({
      subscriptionId: payLink.id,
      customerId: customer.id,
      status: payLink.status,
      message: `Link de pagamento enviado para ${email}`,
      creatorName: c?.name,
      planTitle: plan.title,
    })
  } catch (err) {
    console.error('[POST /api/boomfi/subscribe]', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar assinatura'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

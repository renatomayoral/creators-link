import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { createPixCharge } from '@/lib/c6bank'

const { creator, vipPlan, vipPlanPrice } = schema

const CREATORS_LINK_PIX_KEY = process.env['C6_CREATORS_LINK_PIX_KEY'] ?? ''

const bodySchema = z.object({
  planId: z.string(),
  currency: z.literal('brl'),
  provider: z.enum(['pix_auto', 'pix_manual']),
  /** Fan info (optional) */
  fanName: z.string().max(100).optional(),
  fanCpf: z.string().max(14).optional(),
})

// POST /api/pix/charge — generate a Pix QR Code for a fan subscribing to a plan
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { planId, currency, provider, fanName, fanCpf } = parsed.data

  // Load plan + creator
  const plan = await db.query.vipPlan.findFirst({ where: eq(vipPlan.id, planId) })
  if (!plan || !plan.active) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, plan.creatorId) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  if (!c.pixKey) {
    return NextResponse.json({ error: 'Creator has no Pix key configured' }, { status: 409 })
  }
  if (!CREATORS_LINK_PIX_KEY) {
    return NextResponse.json({ error: 'Platform Pix key not configured' }, { status: 503 })
  }

  // Find the matching price
  const price = await db.query.vipPlanPrice.findFirst({
    where: (vpp, { and, eq: eqF }) =>
      and(eqF(vpp.planId, planId), eqF(vpp.currency, currency), eqF(vpp.provider, provider)),
  })
  if (!price || !price.active) {
    return NextResponse.json({ error: 'Price not available' }, { status: 404 })
  }

  const feePct = parseFloat(c.platformFeePct ?? '10')
  const txid = randomUUID().replace(/-/g, '').slice(0, 35)

  try {
    const charge = await createPixCharge({
      txid,
      valor: price.amountCents / 100,
      nome: fanName,
      cpf: fanCpf,
      infoAdicionais: `${plan.title} — ${c.name}`,
      split: {
        plataformaKey: CREATORS_LINK_PIX_KEY,
        plataformaPct: feePct,
        criadoraKey: c.pixKey,
      },
    })

    return NextResponse.json({
      txid: charge.txid,
      pixCopiaECola: charge.pixCopiaECola,
      qrcode: charge.qrcode,
      location: charge.location,
      amountCents: price.amountCents,
      currency,
    })
  } catch (err) {
    console.error('[POST /api/pix/charge]', err)
    return NextResponse.json({ error: 'Erro ao gerar cobrança Pix' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { stripe } from '@repo/payments/stripe'

const { user } = schema

// GET /api/billing
// Returns the user's active Stripe subscription (if any) and recent invoices.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const u = await db.query.user.findFirst({ where: eq(user.id, session.user.id) })
  if (!u?.stripeCustomerId) {
    return NextResponse.json({ subscription: null, invoices: [] })
  }

  const [subscriptions, invoices] = await Promise.all([
    stripe.subscriptions.list({ customer: u.stripeCustomerId, status: 'all', limit: 1 }),
    stripe.invoices.list({ customer: u.stripeCustomerId, limit: 12 }),
  ])

  const sub = subscriptions.data.find(s => s.status === 'active' || s.status === 'trialing') ?? null

  return NextResponse.json({
    subscription: sub && {
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: sub.items.data[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null,
      priceId: sub.items.data[0]?.price?.id ?? null,
      interval: sub.items.data[0]?.price?.recurring?.interval ?? null,
    },
    invoices: invoices.data.map(inv => ({
      id: inv.id,
      createdAt: new Date(inv.created * 1000).toISOString(),
      totalCents: inv.total,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
    })),
  })
}

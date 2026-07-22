import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { authenticateMerchant } from '@/lib/api-key'

const { plan } = schema

// GET /api/v1/plans/[planId] — fetch a single plan (must belong to the authenticated merchant).
export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const merchant = await authenticateMerchant(req)
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await params
  const found = await db.query.plan.findFirst({
    where: and(eq(plan.id, planId), eq(plan.merchantId, merchant.id)),
  })
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(found)
}

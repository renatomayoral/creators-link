import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'

const { merchant } = schema

const updateTakeRateSchema = z.object({
  takeRatePct: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a positive decimal string')
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, 'Must be between 0 and 100'),
})

// PATCH /api/dashboard/merchant/take-rate — update the platform take-rate percent.
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const found = await getOwnedMerchant(session.user.id)
  if (!found) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = updateTakeRateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const [updated] = await db
    .update(merchant)
    .set({ takeRatePct: parsed.data.takeRatePct, updatedAt: new Date() })
    .where(eq(merchant.id, found.id))
    .returning()

  return NextResponse.json({ merchant: updated })
}

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'

const { merchant } = schema

const updateWebhookSchema = z.object({
  webhookUrl: z.url().optional(),
  regenerateSecret: z.boolean().optional(),
})

// PATCH /api/dashboard/merchant/webhook — update the webhook URL and/or regenerate its signing secret.
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const found = await getOwnedMerchant(session.user.id)
  if (!found) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = updateWebhookSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const newSecret = parsed.data.regenerateSecret ? randomBytes(32).toString('hex') : undefined

  const [updated] = await db
    .update(merchant)
    .set({
      webhookUrl: parsed.data.webhookUrl ?? found.webhookUrl,
      webhookSecret: newSecret ?? found.webhookSecret,
      updatedAt: new Date(),
    })
    .where(eq(merchant.id, found.id))
    .returning()

  return NextResponse.json({ merchant: updated, webhookSecret: newSecret ?? undefined })
}

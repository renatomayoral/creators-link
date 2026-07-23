import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { generateApiKey } from '@/lib/api-key'
import { newId } from '@/lib/ids'

const { merchant } = schema

const createMerchantSchema = z.object({
  name: z.string().min(1).max(200),
})

// GET /api/dashboard/merchant — the merchant owned by the current session user, or null.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const found = await getOwnedMerchant(session.user.id)
  return NextResponse.json({ merchant: found ?? null })
}

// POST /api/dashboard/merchant — onboarding: create the merchant for this user.
// Returns the raw API key exactly once — it is never retrievable again.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await getOwnedMerchant(session.user.id)
  if (existing) return NextResponse.json({ error: 'You already have a merchant' }, { status: 409 })

  const body = await req.json().catch(() => null)
  const parsed = createMerchantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const { rawKey, apiKeyHash, apiKeyPrefix } = generateApiKey()

  const [created] = await db
    .insert(merchant)
    .values({
      id: newId('merchant'),
      ownerUserId: session.user.id,
      name: parsed.data.name,
      apiKeyHash,
      apiKeyPrefix,
    })
    .returning()

  return NextResponse.json({ merchant: created, rawApiKey: rawKey }, { status: 201 })
}

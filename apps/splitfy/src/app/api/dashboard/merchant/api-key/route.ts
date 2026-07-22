import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { getOwnedMerchant } from '@/lib/owned-merchant'
import { generateApiKey } from '@/lib/api-key'

const { merchant } = schema

// POST /api/dashboard/merchant/api-key — regenerates the merchant's API key.
// The previous key stops working immediately (only the hash is stored, so the
// old raw key can never be recovered or re-validated once overwritten).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const found = await getOwnedMerchant(session.user.id)
  if (!found) return NextResponse.json({ error: 'No merchant found' }, { status: 404 })

  const { rawKey, apiKeyHash, apiKeyPrefix } = generateApiKey()
  await db.update(merchant).set({ apiKeyHash, apiKeyPrefix, updatedAt: new Date() }).where(eq(merchant.id, found.id))

  return NextResponse.json({ rawApiKey: rawKey })
}

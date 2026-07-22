import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { db, schema } from '@/db'

const { merchant } = schema

const KEY_PREFIX_LEN = 8

/** Generates a new raw API key (shown to the merchant exactly once) + its hash/prefix for storage. */
export function generateApiKey(): { rawKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const rawKey = `sfy_${randomBytes(24).toString('hex')}`
  return {
    rawKey,
    apiKeyHash: hashApiKey(rawKey),
    apiKeyPrefix: rawKey.slice(0, KEY_PREFIX_LEN),
  }
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export type AuthedMerchant = typeof merchant.$inferSelect

/** Resolves the merchant for a request's `X-API-Key` header, or null if invalid/missing/suspended. */
export async function authenticateMerchant(req: NextRequest): Promise<AuthedMerchant | null> {
  const rawKey = req.headers.get('x-api-key')
  if (!rawKey) return null

  const hash = hashApiKey(rawKey)
  const found = await db.query.merchant.findFirst({ where: eq(merchant.apiKeyHash, hash) })
  if (!found) return null
  if (!safeEqual(found.apiKeyHash, hash)) return null
  if (found.status !== 'active') return null

  return found
}

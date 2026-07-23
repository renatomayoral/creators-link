import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'

const { merchant } = schema

/** Returns the merchant owned by this dashboard user, or null if they haven't onboarded yet. */
export async function getOwnedMerchant(userId: string) {
  return db.query.merchant.findFirst({ where: eq(merchant.ownerUserId, userId) })
}

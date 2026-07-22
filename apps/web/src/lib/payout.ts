import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'

const { creator } = schema

type CreatorRow = typeof creator.$inferSelect

/**
 * Resolves which Stripe connected account a creator's card payments should
 * settle to. Normally that's the creator's own account — but if
 * stripePayoutMode is 'centralized' (e.g. an agency funneling multiple
 * creators' revenue into one hub), it's the hub creator's account instead.
 * Falls back to the creator's own account if the hub is missing, not
 * onboarded, or owned by a different user — a bad setting should never
 * break checkout.
 */
export async function resolvePayoutAccountId(c: CreatorRow): Promise<string> {
  if (c.stripePayoutMode === 'centralized' && c.payoutHubCreatorId) {
    const hub = await db.query.creator.findFirst({ where: eq(creator.id, c.payoutHubCreatorId) })
    if (hub?.stripeAccountId && hub.stripeOnboarded && hub.userId === c.userId) {
      return hub.stripeAccountId
    }
  }
  return c.stripeAccountId!
}

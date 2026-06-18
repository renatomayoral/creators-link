import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { userProfile } = schema

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  return NextResponse.json({
    onboardingStep: profile?.onboardingStep ?? 0,
    selectedPlatforms: profile?.selectedPlatforms ?? [],
    stripeMode: profile?.stripeMode ?? null,
    stripeOnboarded: profile?.stripeOnboarded ?? false,
  })
}

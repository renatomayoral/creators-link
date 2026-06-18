import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { userProfile } = schema

// POST /api/onboarding/complete — marks onboarding as done (step 4)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (existing) {
    await db
      .update(userProfile)
      .set({ onboardingStep: 4, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id))
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      onboardingStep: 4,
      welcomeVideoUsed: false,
      stripeOnboarded: false,
      selectedPlatforms: [],
    })
  }

  return NextResponse.json({ ok: true })
}

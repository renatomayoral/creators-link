import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import { randomUUID } from 'node:crypto'

const { userProfile } = schema

const bodySchema = z.object({
  platforms: z.array(z.string()).min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (existing) {
    await db
      .update(userProfile)
      .set({
        selectedPlatforms: parsed.data.platforms,
        onboardingStep: Math.max(existing.onboardingStep, 2),
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, session.user.id))
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      selectedPlatforms: parsed.data.platforms,
      onboardingStep: 2,
      welcomeVideoUsed: false,
      stripeOnboarded: false,
    })
  }

  return NextResponse.json({ ok: true })
}

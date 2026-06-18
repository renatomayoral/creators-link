import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'
import {
  createConnectedAccount,
  createOnboardingLink,
  createDashboardLink,
  isAccountReady,
} from '@repo/payments/stripe/connect'

const { userProfile } = schema

function appUrl() {
  return process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
}

const bodySchema = z.object({
  mode: z.enum(['agency', 'per_creator']),
})

// POST /api/onboarding/stripe-connect
// - mode='agency': creates/resumes a Connect account for the user (agency-level)
// - mode='per_creator': just saves the preference, Connect happens per creator later
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { mode } = parsed.data

  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  // Save/update mode preference
  if (existing) {
    await db
      .update(userProfile)
      .set({ stripeMode: mode, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id))
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      stripeMode: mode,
      stripeOnboarded: false,
      onboardingStep: 0,
      selectedPlatforms: [],
      welcomeVideoUsed: false,
    })
  }

  // Per-creator mode: no agency account needed — redirect straight to next step
  if (mode === 'per_creator') {
    await db
      .update(userProfile)
      .set({ onboardingStep: Math.max(existing?.onboardingStep ?? 0, 1), updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id))
    return NextResponse.json({ status: 'per_creator' })
  }

  // Agency mode: create or resume the Connect account
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (profile?.stripeAccountId && profile.stripeOnboarded) {
    const url = await createDashboardLink(profile.stripeAccountId)
    return NextResponse.json({ status: 'onboarded', url })
  }

  let accountId = profile?.stripeAccountId
  if (!accountId) {
    const account = await createConnectedAccount({
      email: session.user.email,
      creatorId: session.user.id, // agency = user id
    })
    accountId = account.id
    await db
      .update(userProfile)
      .set({ stripeAccountId: accountId, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id))
  }

  const locale = req.headers.get('x-locale') ?? 'br'
  const url = await createOnboardingLink({
    accountId,
    refreshUrl: `${appUrl()}/${locale}/onboarding?step=1&connect=refresh`,
    returnUrl: `${appUrl()}/${locale}/onboarding?step=1&connect=return`,
  })

  return NextResponse.json({ status: 'onboarding', url })
}

// GET /api/onboarding/stripe-connect — sync status after returning from Stripe
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (!profile?.stripeAccountId) {
    return NextResponse.json({ connected: false, onboarded: false })
  }

  const ready = await isAccountReady(profile.stripeAccountId)
  if (ready !== profile.stripeOnboarded) {
    await db
      .update(userProfile)
      .set({
        stripeOnboarded: ready,
        onboardingStep: ready ? Math.max(profile.onboardingStep, 1) : profile.onboardingStep,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, session.user.id))
  }

  return NextResponse.json({ connected: true, onboarded: ready })
}

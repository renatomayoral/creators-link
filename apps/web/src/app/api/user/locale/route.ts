import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { userProfile } = schema

const bodySchema = z.object({
  locale: z.enum(['br', 'en', 'es']),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
    columns: { preferredLocale: true },
  })

  const locale = profile?.preferredLocale ?? null
  const response = NextResponse.json({ locale })
  if (locale) {
    const cookieOpts = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' } as const
    response.cookies.set('preferred_locale', locale, cookieOpts)
    response.cookies.set('NEXT_LOCALE', locale, cookieOpts)
  }
  return response
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })

  const { locale } = parsed.data

  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  })

  if (existing) {
    await db
      .update(userProfile)
      .set({ preferredLocale: locale, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id))
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      preferredLocale: locale,
      welcomeVideoUsed: false,
      stripeOnboarded: false,
      selectedPlatforms: [],
      onboardingStep: 0,
    })
  }

  const response = NextResponse.json({ ok: true })
  const cookieOpts = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' } as const
  // preferred_locale: read by our middleware to sync into NEXT_LOCALE
  response.cookies.set('preferred_locale', locale, cookieOpts)
  // NEXT_LOCALE: read natively by next-intl middleware for immediate effect
  response.cookies.set('NEXT_LOCALE', locale, cookieOpts)
  return response
}

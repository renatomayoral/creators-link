import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Hostnames that belong to the app itself — not custom creator domains
const APP_HOSTNAMES = new Set<string>(
  ['localhost', '127.0.0.1', process.env.NEXT_PUBLIC_APP_DOMAIN ?? ''].filter(Boolean),
)

function isAppHost(hostname: string) {
  // strip port, then check exact match or .vercel.app / .ngrok suffix
  const host = hostname.split(':')[0] ?? ''
  if (APP_HOSTNAMES.has(host)) return true
  if (host.endsWith('.vercel.app')) return true
  if (host.endsWith('.ngrok.io') || host.endsWith('.ngrok-free.app')) return true
  return false
}

export async function proxy(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname
  console.log("PROXY RUNNING for path:", pathname, "host:", hostname)

  // ── Root path handling ───────────────────────────────────────────────────
  if (pathname === '/') {
    // Custom creator domain → rewrite to /p/{slug} (URL stays as custom domain)
    if (!isAppHost(hostname)) {
      const slug = await resolveCustomDomain(hostname.split(':')[0] ?? '')
      if (slug) {
        const url = req.nextUrl.clone()
        url.pathname = `/p/${slug}`
        return NextResponse.rewrite(url)
      }
      // Unknown custom domain — 404
      return new NextResponse('Not found', { status: 404 })
    }
    // App host root is the public landing page — run next-intl middleware
    return intlMiddleware(req)
  }

  // ── Public creator pages — skip intl prefix ──────────────────────────────
  if (pathname.startsWith('/p/')) {
    return NextResponse.next()
  }

  // ── Auth guard for protected app routes ──────────────────────────────────
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/creators') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding') ||
    /^\/(br|en|es)\/(admin|creators|settings|onboarding)(\/|$)/.test(pathname)

  if (isProtectedRoute) {
    const sessionRes = await fetch(new URL('/api/auth/get-session', req.url), {
      headers: req.headers,
    })
    const session = sessionRes.ok ? await sessionRes.json() : null

    if (!session?.user) {
      const locale = pathname.match(/^\/(br|en|es)(\/|$)/)?.[1] ?? 'br'
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect new users to onboarding (skip if already on onboarding)
    const isOnboarding = /^\/(br|en|es)\/onboarding(\/|$)/.test(pathname)
    if (!isOnboarding) {
      try {
        const statusRes = await fetch(new URL('/api/onboarding/status', req.url), {
          headers: req.headers,
        })
        if (statusRes.ok) {
          const status = await statusRes.json()
          if (status.onboardingStep === 0) {
            const locale = pathname.match(/^\/(br|en|es)(\/|$)/)?.[1] ?? 'br'
            return NextResponse.redirect(new URL(`/${locale}/onboarding`, req.url))
          }
        }
      } catch {
        // non-blocking — if status check fails, let the user through
      }
    }
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let domainCache: Map<string, string> | null = null
let cacheAt = 0
const CACHE_TTL_MS = 60_000 // refresh domain→slug map every 60 s

async function resolveCustomDomain(domain: string): Promise<string | null> {
  const now = Date.now()
  if (!domainCache || now - cacheAt > CACHE_TTL_MS) {
    try {
      // Dynamic import keeps the DB client out of the edge bundle when not needed
      const { db, schema } = await import('@repo/db')
      const { isNotNull } = await import('drizzle-orm')
      const rows = await db
        .select({ domain: schema.creator.customDomain, slug: schema.creator.slug })
        .from(schema.creator)
        .where(isNotNull(schema.creator.customDomain))
      domainCache = new Map(
        rows
          .filter((r): r is { domain: string; slug: string } => r.domain !== null)
          .map((r) => [r.domain.toLowerCase(), r.slug]),
      )
      cacheAt = now
    } catch {
      return null
    }
  }
  return domainCache.get(domain.toLowerCase()) ?? null
}

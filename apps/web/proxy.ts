import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@repo/auth'
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

  // ── Auth guard for protected app routes ──────────────────────────────────
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/creators') ||
    pathname.startsWith('/settings') ||
    /^\/(pt-BR|en|es)\/(admin|creators|settings)(\/|$)/.test(pathname)

  if (isProtectedRoute) {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
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

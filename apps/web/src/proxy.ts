import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@repo/auth'

export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/studio/:path*',
    '/studio',
    '/admin/:path*',
    '/library/:path*',
    '/settings/:path*',
  ],
}

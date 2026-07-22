import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

/** Server-side guard for dashboard pages/routes: redirects to /login if there's no session. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return session
}

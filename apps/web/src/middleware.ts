import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// next-intl reads NEXT_LOCALE cookie natively for locale preference.
// The /api/user/locale endpoint sets both NEXT_LOCALE and preferred_locale
// so the choice persists across logins (preferred_locale stored in DB,
// rehydrated as NEXT_LOCALE cookie on login via /api/auth/* session).
export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

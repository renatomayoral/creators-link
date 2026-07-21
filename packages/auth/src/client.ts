import { createAuthClient } from 'better-auth/react'
import { stripeClient } from '@better-auth/stripe/client'

// Use current origin at runtime so it works in any environment
// (localhost in dev, Cloud Run URL in prod) without build-time env vars
const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000')

export const authClient = createAuthClient({
  baseURL,
  plugins: [stripeClient({ subscription: true })],
})

export type { Session, User } from './index'

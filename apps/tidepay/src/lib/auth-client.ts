'use client'

import { createAuthClient } from 'better-auth/react'

// Client-side counterpart to lib/auth.ts (the merchant dashboard's own Better
// Auth instance — separate from apps/web's, so splitfy never shares user
// accounts/sessions with creators-link). Uses the current origin at runtime so
// it works in any environment without build-time env vars.
const baseURL = typeof window !== 'undefined' ? window.location.origin : undefined

export const authClient = createAuthClient({ baseURL })

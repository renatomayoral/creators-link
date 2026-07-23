import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db, schema } from '@/db'
import { env } from '@/env'

// Scaffold only in this milestone — powers a future merchant dashboard.
// Merchant-to-tidepay API access uses X-API-Key (lib/api-key.ts), not this.
export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
})

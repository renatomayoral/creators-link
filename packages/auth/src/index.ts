import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { stripe as stripePlugin } from '@better-auth/stripe'
import { db, schema } from '@repo/db'
import { stripe, PLANS } from '@repo/payments'

export const auth = betterAuth({
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
  secret: process.env['BETTER_AUTH_SECRET'],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    },
  },
  plugins: [
    stripePlugin({
      stripeClient: stripe,
      stripeWebhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: Object.values(PLANS)
          .filter((p) => p.priceId && p.priceId !== 'price_')
          .map((p) => ({
            name: p.label,
            priceId: p.priceId,
          })),
      },
    }),
  ],
  trustedOrigins: [
    process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

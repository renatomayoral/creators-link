import Stripe from 'stripe'

export const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
  apiVersion: '2025-08-27.basil',
})

export type Plan = {
  priceId: string | undefined
  amount: number
  label: string
  description: string
}

export const PLANS: Record<string, Plan> = {
  starter: {
    priceId: process.env['STRIPE_PRICE_STARTER'],
    amount: 49,
    label: 'Starter',
    description: 'Perfect for solo creators exploring AI generation.',
  },
  creator: {
    priceId: process.env['STRIPE_PRICE_CREATOR'],
    amount: 149,
    label: 'Creator',
    description: 'For professional creators who need speed and scale.',
  },
  studio: {
    priceId: process.env['STRIPE_PRICE_STUDIO'],
    amount: 499,
    label: 'Studio',
    description: 'For studios, platforms, and power users.',
  },
}

'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@repo/auth/client'

// Pricing CTAs for paid plans (Creator/Pro): if the visitor is already
// logged in, clicking upgrades the existing account directly via Stripe
// Checkout instead of bouncing through /login again.
export function PricingCta({
  plan,
  style,
  children,
}: {
  plan: string
  style: CSSProperties
  children: ReactNode
}) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    if (!session) return // not logged in — let the <a href="/login"> navigate normally
    e.preventDefault()
    setLoading(true)
    const { error } = await authClient.subscription.upgrade({
      plan,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    })
    setLoading(false)
    if (error) {
      alert(error.message ?? 'Erro ao iniciar assinatura. Tente novamente.')
    }
  }

  return (
    <a
      href="/login"
      onClick={handleClick}
      style={{ ...style, opacity: isPending || loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
    >
      {loading ? '...' : children}
    </a>
  )
}

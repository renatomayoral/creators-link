'use client'

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { authClient } from '@repo/auth/client'

type Subscription = { plan: string; status: string }

// The landing page isn't wrapped in the app's QueryClientProvider (that only
// covers the authenticated (app) layout), so this can't use useQuery — a
// plain effect + module-level cache is enough for a single one-off fetch
// shared across the pricing cards on this page.
let cachedActivePlan: string | null | undefined // undefined = not fetched yet

function useActivePlan(session: unknown): string | undefined {
  const [plan, setPlan] = useState<string | null | undefined>(cachedActivePlan)

  useEffect(() => {
    if (!session || cachedActivePlan !== undefined) return
    authClient.subscription.list().then(res => {
      const active = (res.data ?? []).find(
        (s: Subscription) => s.status === 'active' || s.status === 'trialing',
      )
      cachedActivePlan = active?.plan ?? null
      setPlan(cachedActivePlan)
    })
  }, [session])

  return plan ?? undefined
}

// Pricing CTAs for paid plans (Creator/Pro): if the visitor is already
// logged in, clicking upgrades the existing account directly via Stripe
// Checkout instead of bouncing through /login again. If the visitor is
// already on this exact plan, the button becomes a disabled "Plano atual"
// instead of retrying an upgrade Stripe will reject (no changes to confirm).
export function PricingCta({
  plan,
  style,
  children,
}: {
  plan: string
  style: CSSProperties
  children: ReactNode
}) {
  const locale = useLocale()
  const { data: session, isPending } = authClient.useSession()
  const activePlan = useActivePlan(session)
  const [loading, setLoading] = useState(false)

  const isCurrentPlan = activePlan === plan

  async function handleClick(e: React.MouseEvent) {
    if (!session || isCurrentPlan) return // not logged in, or already this plan — no-op
    e.preventDefault()
    setLoading(true)
    const dashboardUrl = `${window.location.origin}/${locale}/settings/billing`
    const { error } = await authClient.subscription.upgrade({
      plan,
      successUrl: dashboardUrl,
      cancelUrl: window.location.href,
    })
    setLoading(false)
    if (error) {
      alert(error.message ?? 'Erro ao iniciar assinatura. Tente novamente.')
    }
  }

  if (isCurrentPlan) {
    return (
      <div
        style={{
          ...style,
          opacity: 0.6,
          cursor: 'default',
          pointerEvents: 'none',
        }}
      >
        Plano atual
      </div>
    )
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

// CTA for the Free plan: if the visitor is already logged in, go straight to
// the dashboard instead of bouncing through /login again.
export function FreeCta({ style, children }: { style: CSSProperties; children: ReactNode }) {
  const router = useRouter()
  const locale = useLocale()
  const { data: session, isPending } = authClient.useSession()

  function handleClick(e: React.MouseEvent) {
    if (!session) return // not logged in — let the <a href="/login"> navigate normally
    e.preventDefault()
    router.push(`/${locale}/dashboard`)
  }

  return (
    <a href="/login" onClick={handleClick} style={{ ...style, opacity: isPending ? 0.7 : 1 }}>
      {children}
    </a>
  )
}

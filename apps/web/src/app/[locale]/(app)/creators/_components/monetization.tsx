'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Wallet } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { useToast } from '@repo/ui/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { type CreatorDetail } from '@/lib/creators'
import { type VipPlan } from '../_lib/vip-plans'
import { VipPlanList } from './vip-plan-list'
import { NewVipPlan } from './new-vip-plan'

type Props = { detail: CreatorDetail }

export function Monetization({ detail }: Props) {
  const t = useTranslations()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)

  // Sync Stripe onboarding status when creator returns from Connect flow
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('connect') !== 'return') return
    void fetch(`/api/creators/${detail.id}/connect`).then(() => {
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
      window.history.replaceState({}, '', window.location.pathname)
    })
  }, [detail.id, qc])

  const { data: plans = [] } = useQuery<VipPlan[]>({
    queryKey: ['vip-plans', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/plans`).then((r) => r.json()),
    enabled: detail.stripeOnboarded,
  })

  async function connect() {
    setConnecting(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/connect`, { method: 'POST' })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) throw new Error(body.error ?? t('creators.toastConnectError'))
      window.location.href = body.url
    } catch (e) {
      toast({ title: t('creators.toastConnectError'), description: (e as Error).message, variant: 'destructive' })
      setConnecting(false)
    }
  }

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="text-muted-foreground h-4 w-4" />
        <span className="text-[13px] font-semibold">
          {t('creators.monetizationCard')}
        </span>
        {detail.stripeOnboarded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <Check className="h-3 w-3" />
            {t('creators.paymentsActive')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
            {t('creators.notConnected')}
          </span>
        )}
      </div>

      <p className="text-muted-foreground mb-3 text-[13px]">
        {t('creators.stripeExplanation')}
      </p>

      {!detail.stripeOnboarded ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
          <p className="text-muted-foreground text-[13px]">
            {t('creators.connectDescription')}
          </p>
          <Button size="sm" onClick={connect} disabled={connecting} className="self-start">
            {connecting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-1.5 h-4 w-4" />
            )}
            {t('creators.connectStripeButton')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <VipPlanList plans={plans} creatorId={detail.id} />
          <NewVipPlan
            creatorId={detail.id}
            onCreated={() => qc.invalidateQueries({ queryKey: ['vip-plans', detail.id] })}
          />
        </div>
      )}
    </div>
  )
}

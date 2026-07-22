'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Wallet } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Switch } from '@repo/ui/components/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { useToast } from '@repo/ui/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { type CreatorDetail } from '@/lib/creators'
import { type VipPlan } from '../_lib/vip-plans'
import { VipPlanList } from './vip-plan-list'
import { NewVipPlan } from './new-vip-plan'

type PayoutHubCandidate = { id: string; name: string }

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

  const { data: hubCandidates = [] } = useQuery<PayoutHubCandidate[]>({
    queryKey: ['payout-hubs', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/payout-hubs`).then((r) => r.json()),
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

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/creators/${detail.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Falha ao salvar')
    }
    void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
  }

  async function toggleCentralized(enabled: boolean) {
    try {
      await patch({
        stripePayoutMode: enabled ? 'centralized' : 'own',
        payoutHubCreatorId: enabled ? detail.payoutHubCreatorId : null,
      })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function selectHub(hubId: string) {
    try {
      await patch({ payoutHubCreatorId: hubId })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
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
          {hubCandidates.length > 0 && (
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-semibold">Receber centralizado</span>
                  <p className="text-muted-foreground text-[12px]">
                    Envia o dinheiro dessa criadora para a conta Stripe de outra criadora sua —
                    útil para agências que concentram o recebimento numa única conta.
                  </p>
                </div>
                <Switch
                  checked={detail.stripePayoutMode === 'centralized'}
                  onCheckedChange={toggleCentralized}
                />
              </div>

              {detail.stripePayoutMode === 'centralized' && (
                <div className="mt-3 flex flex-col gap-1 border-t pt-3">
                  <span className="text-[12px] text-muted-foreground">Receber na conta de</span>
                  <Select
                    value={detail.payoutHubCreatorId ?? undefined}
                    onValueChange={selectHub}
                  >
                    <SelectTrigger className="h-8 text-[13px]">
                      <SelectValue placeholder="Escolha a criadora que recebe" />
                    </SelectTrigger>
                    <SelectContent>
                      {hubCandidates.map(hub => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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

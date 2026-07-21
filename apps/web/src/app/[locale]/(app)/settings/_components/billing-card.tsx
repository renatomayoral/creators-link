'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Button } from '@repo/ui/components/button'
import { authClient } from '@repo/auth/client'
import { PLANS } from '@repo/payments/plans'

type Subscription = {
  plan: string
  status: string
  periodEnd?: string | Date
  cancelAtPeriodEnd?: boolean
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export function BillingCard() {
  const [openingPortal, setOpeningPortal] = useState(false)

  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const res = await authClient.subscription.list()
      return res.data ?? []
    },
  })

  const active = subscriptions?.find(s => s.status === 'active' || s.status === 'trialing')

  async function openBillingPortal() {
    setOpeningPortal(true)
    try {
      await authClient.subscription.billingPortal({ returnUrl: window.location.href })
    } finally {
      setOpeningPortal(false)
    }
  }

  const planInfo = active ? PLANS[active.plan] : undefined
  const periodEnd = active?.periodEnd ? new Date(active.periodEnd) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : !active ? (
          <p className="text-muted-foreground text-sm">Nenhum plano ativo.</p>
        ) : (
          <div>
            <p className="font-semibold">Plano {planInfo?.label ?? active.plan}</p>
            {periodEnd && (
              <p className="text-muted-foreground text-sm">
                {active.cancelAtPeriodEnd
                  ? `Cancelamento agendado para ${dateFormatter.format(periodEnd)}.`
                  : `Sua assinatura será renovada automaticamente em ${dateFormatter.format(periodEnd)}.`}
              </p>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="gap-2"
          disabled={openingPortal}
          onClick={openBillingPortal}
        >
          {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Gerenciar assinatura
        </Button>
      </CardContent>
    </Card>
  )
}

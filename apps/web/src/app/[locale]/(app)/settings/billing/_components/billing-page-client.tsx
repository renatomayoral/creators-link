'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle2, ArrowUpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Button } from '@repo/ui/components/button'
import { useToast } from '@repo/ui/hooks/use-toast'
import { authClient } from '@repo/auth/client'
import { PLANS } from '@repo/payments/plans'

const PRICING_URL = '/br#precos'

type Subscription = {
  plan: string
  status: string
  periodEnd?: string | Date
  cancelAtPeriodEnd?: boolean
}

type Invoice = {
  id: string
  createdAt: string
  totalCents: number
  currency: string
  status: string | null
  hostedInvoiceUrl: string | null
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

const invoiceStatusLabel: Record<string, string> = {
  paid: 'Pago',
  open: 'Em aberto',
  void: 'Cancelado',
  uncollectible: 'Não cobrado',
  draft: 'Rascunho',
}

export function BillingPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [canceling, setCanceling] = useState(false)

  const { data: subscriptions, isLoading: loadingSub } = useQuery<Subscription[]>({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const res = await authClient.subscription.list()
      return res.data ?? []
    },
  })

  const { data: billing, isLoading: loadingInvoices } = useQuery<{
    invoices: Invoice[]
  }>({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/billing')
      return res.json()
    },
  })

  const active = subscriptions?.find(s => s.status === 'active' || s.status === 'trialing')
  const planInfo = active ? PLANS[active.plan] : undefined
  const periodEnd = active?.periodEnd ? new Date(active.periodEnd) : null
  const invoices = billing?.invoices ?? []

  async function cancelPlan() {
    if (!confirm('Cancelar sua assinatura? Você continua com acesso até o fim do período já pago.')) return
    setCanceling(true)
    const { error } = await authClient.subscription.cancel({ returnUrl: window.location.href })
    setCanceling(false)
    if (error) {
      toast({
        title: 'Erro ao cancelar',
        description: error.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } else {
      void qc.invalidateQueries({ queryKey: ['billing-subscription'] })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {active ? `Plano ${planInfo?.label ?? active.plan}` : 'Plano Free'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSub ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : active ? (
            <>
              <p className="text-muted-foreground text-sm">Mensal</p>
              {periodEnd && (
                <p className="text-muted-foreground text-sm">
                  {active.cancelAtPeriodEnd
                    ? `Cancelamento agendado para ${monthYearFormatter.format(periodEnd)}.`
                    : `Sua assinatura será renovada automaticamente em ${monthYearFormatter.format(periodEnd)}.`}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Você está no plano gratuito. Faça upgrade para reduzir a taxa por transação e desbloquear
              mais recursos.
            </p>
          )}

          <Button asChild variant={active ? 'outline' : 'default'} size="sm" className="gap-2">
            <Link href={PRICING_URL}>
              <ArrowUpCircle className="h-4 w-4" />
              {active ? 'Fazer upgrade' : 'Ajustar plano'}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Cobrança via Stripe
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma fatura ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">Data</th>
                    <th className="py-2 font-medium">Total</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2">{dateFormatter.format(new Date(inv.createdAt))}</td>
                      <td className="py-2">
                        {(inv.totalCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: inv.currency.toUpperCase(),
                        })}
                      </td>
                      <td className="py-2">{invoiceStatusLabel[inv.status ?? ''] ?? inv.status}</td>
                      <td className="py-2">
                        {inv.hostedInvoiceUrl && (
                          <Link
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            Ver
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {active && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">Cancelar plano</p>
              <Button variant="destructive" size="sm" disabled={canceling} onClick={cancelPlan}>
                {canceling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

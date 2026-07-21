'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bitcoin, Loader2, ArrowDownToLine, Settings2, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { useToast } from '@repo/ui/hooks/use-toast'
import { type CreatorDetail } from '@/lib/creators'

type Props = { detail: CreatorDetail }

type Balance = { currency: string; balance: number }
type CryptoConfig = {
  boomfiAccountRef: string | null
  cryptoWithdrawAddress: string | null
  cryptoWithdrawCurrency: string | null
}

// EVM chain ids BoomFi supports for the Virtual Account's managed/external wallet.
const CHAINS = [
  { id: 137, label: 'Polygon' },
  { id: 42161, label: 'Arbitrum' },
  { id: 1, label: 'Ethereum' },
  { id: 56, label: 'BNB Smart Chain' },
  { id: 8453, label: 'Base' },
]

const setupSchema = z.object({
  cryptoWithdrawAddress: z.string().min(10, 'Endereço inválido'),
  cryptoWithdrawCurrency: z.string().min(2, 'Informe a moeda (ex: usdt)'),
  chainId: z.number().int().positive(),
})
type SetupForm = z.infer<typeof setupSchema>

export function CryptoPanel({ detail }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showConfig, setShowConfig] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  const { data: config, isLoading: loadingConfig } = useQuery<CryptoConfig>({
    queryKey: ['crypto-config', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/crypto/setup`).then(r => r.json()),
  })

  const { data: balanceData, isLoading: loadingBalance } = useQuery<{ balances: Balance[] }>({
    queryKey: ['crypto-balance', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/crypto/withdraw`).then(r => r.json()),
    enabled: !!config?.boomfiAccountRef,
    refetchInterval: 60_000,
  })

  const balances = (balanceData?.balances ?? []).filter(b => b.balance > 0)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      cryptoWithdrawAddress: config?.cryptoWithdrawAddress ?? '',
      cryptoWithdrawCurrency: config?.cryptoWithdrawCurrency ?? 'usdt',
      chainId: CHAINS[0]?.id,
    },
  })

  async function onSaveConfig(data: SetupForm) {
    const res = await fetch(`/api/creators/${detail.id}/crypto/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro', description: body.error ?? 'Falha ao salvar', variant: 'destructive' })
      return
    }
    toast({ title: 'Crypto configurado!', description: 'Conta de settlement BoomFi criada com sucesso.' })
    setShowConfig(false)
    void qc.invalidateQueries({ queryKey: ['crypto-config', detail.id] })
    void qc.invalidateQueries({ queryKey: ['crypto-balance', detail.id] })
  }

  async function withdraw(currency: string, amount: number, chainId: number) {
    setWithdrawing(currency)
    try {
      const res = await fetch(`/api/creators/${detail.id}/crypto/withdraw`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currency, amount: String(amount), chainId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Erro ao sacar')
      toast({ title: 'Saque iniciado!', description: `${amount} ${currency.toUpperCase()} enviado para sua carteira.` })
      void qc.invalidateQueries({ queryKey: ['crypto-balance', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setWithdrawing(null)
    }
  }

  if (loadingConfig) return null

  const isSetup = !!config?.boomfiAccountRef

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Bitcoin className="text-muted-foreground h-4 w-4" />
        <span className="text-[13px] font-semibold">Crypto · BoomFi</span>
        {isSetup && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </span>
        )}
        <button
          onClick={() => setShowConfig(v => !v)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Config form */}
      {(!isSetup || showConfig) && (
        <form onSubmit={handleSubmit(onSaveConfig)} className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed p-4">
          <p className="text-muted-foreground text-[13px]">
            {isSetup
              ? 'Atualizar configurações de saque crypto.'
              : 'Configure sua carteira para receber pagamentos crypto. A taxa da plataforma é repassada automaticamente em cada cobrança — o restante cai direto na sua carteira.'}
          </p>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Rede</Label>
            <Select
              value={String(watch('chainId'))}
              onValueChange={v => setValue('chainId', Number(v))}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="Selecione a rede" />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map(chain => (
                  <SelectItem key={chain.id} value={String(chain.id)}>
                    {chain.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Endereço da carteira</Label>
            <Input
              {...register('cryptoWithdrawAddress')}
              placeholder="Ex: 0x1234...abcd"
              className="h-8 text-[13px] font-mono"
            />
            {errors.cryptoWithdrawAddress && (
              <span className="text-[11px] text-red-400">{errors.cryptoWithdrawAddress.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Moeda (ticker)</Label>
            <Input
              {...register('cryptoWithdrawCurrency')}
              placeholder="Ex: usdt, usdc, eth"
              className="h-8 text-[13px] font-mono"
            />
            {errors.cryptoWithdrawCurrency && (
              <span className="text-[11px] text-red-400">{errors.cryptoWithdrawCurrency.message}</span>
            )}
          </div>

          <Button type="submit" size="sm" disabled={isSubmitting} className="self-start">
            {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {isSetup ? 'Atualizar configuração' : 'Ativar crypto'}
          </Button>
        </form>
      )}

      {/* Balance + withdraw — covers any balance left in the managed account beyond the automatic split */}
      {isSetup && (
        <div className="flex flex-col gap-2">
          {loadingBalance ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando saldo...
            </div>
          ) : balances.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Saldo: R$ 0 — repasse automático já cobre pagamentos recebidos.
            </p>
          ) : (
            balances.map(b => (
              <div key={b.currency} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <span className="text-[13px] font-semibold">{b.balance.toFixed(6)}</span>
                  <span className="ml-1.5 text-[11px] text-muted-foreground uppercase">{b.currency}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[12px]"
                  disabled={withdrawing === b.currency}
                  onClick={() => withdraw(b.currency, b.balance, watch('chainId'))}
                >
                  {withdrawing === b.currency
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <ArrowDownToLine className="h-3 w-3" />
                  }
                  Sacar tudo
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

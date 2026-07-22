'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bitcoin, Loader2, CheckCircle2, Settings2 } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Switch } from '@repo/ui/components/switch'
import { Label } from '@repo/ui/components/label'
import { useToast } from '@repo/ui/hooks/use-toast'
import { CRYPTO_CHAINS } from '@/lib/crypto-coins'
import { type CreatorDetail } from '@/lib/creators'
import { ChainIcon } from './chain-icon'

type Props = { detail: CreatorDetail }

type SetupConfig = { coinKeys: string[] }
type OwedEntry = { currency: string; cents: number }
type WithdrawInfo = { owed: OwedEntry[]; paymentIds: string[] }

export function CryptoPanel({ detail }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showConfig, setShowConfig] = useState(true)
  const [markingPaid, setMarkingPaid] = useState(false)

  const { data: config, isLoading: loadingConfig } = useQuery<SetupConfig>({
    queryKey: ['crypto-config', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/crypto/setup`).then(r => r.json()),
  })

  const { data: withdrawInfo, isLoading: loadingOwed } = useQuery<WithdrawInfo>({
    queryKey: ['crypto-owed', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/crypto/withdraw`).then(r => r.json()),
    enabled: (config?.coinKeys.length ?? 0) > 0,
  })

  const selectedKeys = new Set(config?.coinKeys ?? [])
  const isSetup = selectedKeys.size > 0
  const owed = (withdrawInfo?.owed ?? []).filter(o => o.cents > 0)

  async function saveKeys(nextKeys: string[]) {
    const queryKey = ['crypto-config', detail.id]
    const previous = qc.getQueryData<SetupConfig>(queryKey)
    // Optimistic update — flip immediately instead of waiting on the
    // round-trip (Supabase pooler latency makes that feel sluggish).
    qc.setQueryData<SetupConfig>(queryKey, { coinKeys: nextKeys })

    try {
      const res = await fetch(`/api/creators/${detail.id}/crypto/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ coinKeys: nextKeys }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Falha ao salvar')
    } catch (e) {
      qc.setQueryData(queryKey, previous) // revert on failure
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  function toggleCoin(coinKey: string, checked: boolean) {
    const next = new Set(selectedKeys)
    if (checked) next.add(coinKey)
    else next.delete(coinKey)
    void saveKeys(Array.from(next))
  }

  function toggleChain(chainCoinKeys: string[], enabled: boolean) {
    const next = new Set(selectedKeys)
    for (const key of chainCoinKeys) {
      if (enabled) next.add(key)
      else next.delete(key)
    }
    void saveKeys(Array.from(next))
  }

  async function markPaidOut() {
    if (!withdrawInfo?.paymentIds.length) return
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/crypto/withdraw`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentIds: withdrawInfo.paymentIds }),
      })
      if (!res.ok) throw new Error('Falha ao marcar como repassado')
      toast({ title: 'Repasse registrado!' })
      void qc.invalidateQueries({ queryKey: ['crypto-owed', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setMarkingPaid(false)
    }
  }

  if (loadingConfig) return null

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Bitcoin className="text-muted-foreground h-4 w-4" />
        <span className="text-[13px] font-semibold">Crypto</span>
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

      <p className="text-muted-foreground mb-3 text-[13px]">
        Pagamento em criptomoedas (USDT/USDC), processado pela BoomFi. O fã paga direto de uma
        carteira cripto, sem cartão ou conta bancária. Os valores caem na conta da plataforma e
        a parte da criadora é repassada manualmente — ainda não há saque automático.
      </p>

      {showConfig && (
        <div className="mb-4 flex flex-col gap-3">
          <p className="text-muted-foreground text-[13px]">
            Escolha quais redes e moedas essa criadora aceita.
          </p>

          {CRYPTO_CHAINS.map(chain => {
            const chainCoinKeys = chain.coins.map(c => c.key)
            const chainEnabled = chainCoinKeys.some(k => selectedKeys.has(k))
            const allSelected = chainCoinKeys.every(k => selectedKeys.has(k))

            return (
              <div key={chain.chainId} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChainIcon iconId={chain.iconId} className="h-5 w-5 shrink-0" />
                    <span className="text-[13px] font-semibold">{chain.label}</span>
                  </div>
                  <Switch
                    checked={chainEnabled}
                    onCheckedChange={v => toggleChain(chainCoinKeys, v)}
                  />
                </div>

                {chainEnabled && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3">
                    {chain.coins.map(coin => (
                      <div key={coin.key} className="flex items-center gap-2">
                        <Checkbox
                          id={coin.key}
                          checked={selectedKeys.has(coin.key)}
                          onCheckedChange={v => toggleCoin(coin.key, v === true)}
                        />
                        <Label htmlFor={coin.key} className="text-[13px] cursor-pointer">
                          {coin.ticker}
                        </Label>
                      </div>
                    ))}
                    <button
                      className="text-muted-foreground hover:text-foreground text-[12px] underline-offset-2 hover:underline"
                      onClick={() => toggleChain(chainCoinKeys, !allSelected)}
                    >
                      {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isSetup && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-muted-foreground">A repassar para a criadora</p>
          {loadingOwed ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando...
            </div>
          ) : owed.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nada pendente de repasse.</p>
          ) : (
            <>
              {owed.map(o => (
                <div key={o.currency} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-[13px] font-semibold uppercase">{o.currency}</span>
                  <span className="text-[13px]">{(o.cents / 100).toFixed(2)}</span>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-7 self-start text-[12px]"
                disabled={markingPaid}
                onClick={markPaidOut}
              >
                {markingPaid ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                Marcar como repassado
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

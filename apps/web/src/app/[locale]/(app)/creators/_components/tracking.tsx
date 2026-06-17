'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, Globe, Loader2 } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { useToast } from '@repo/ui/hooks/use-toast'
import { type CreatorDetail } from '@/lib/creators'
import { Avatar } from './avatar'
import { DomainInstructions } from './domain-instructions'
import { Monetization } from './monetization'

const nf = (n: number) => n.toLocaleString('pt-BR')

type Props = { detail: CreatorDetail }

export function Tracking({ detail }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const maxD = Math.max(1, ...detail.daily)

  const [domainInput, setDomainInput] = useState(detail.customDomain ?? '')
  const [domainSaving, setDomainSaving] = useState(false)

  const publicUrl = detail.customDomain
    ? `https://${detail.customDomain}`
    : `${typeof location !== 'undefined' ? location.origin : ''}/p/${detail.slug}`

  async function saveDomain() {
    setDomainSaving(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/domain`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customDomain: domainInput.trim() || null }),
      })
      const body = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok)
        throw new Error(typeof body.error === 'string' ? body.error : 'Erro ao salvar domínio')
      toast({ title: domainInput.trim() ? 'Domínio salvo' : 'Domínio removido' })
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setDomainSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl border">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={detail.name} url={detail.avatarUrl} size={44} />
          <div>
            <div className="text-[16px] font-bold">Rastreio de links · {detail.name}</div>
            <div className="text-muted-foreground font-mono text-[13px]">/p/{detail.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ver página
            </Button>
          </a>
          <Button size="sm">Relatório completo</Button>
        </div>
      </div>

      {/* Chart + platform breakdown */}
      <div className="grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-muted-foreground text-[13px] font-semibold">
              Cliques · últimos 14 dias
            </span>
            <span className="text-[22px] font-extrabold">
              {nf(detail.totalClicks30d)}{' '}
              <span className="text-muted-foreground text-[13px] font-medium">total</span>
            </span>
          </div>
          <div className="flex h-42.5 items-end gap-1.5 border-b pb-0.5">
            {detail.daily.map((v, i) => (
              <div
                key={i}
                className="flex-1 origin-bottom rounded-t-lg"
                style={{
                  height: `${Math.max(Math.round((v / maxD) * 100), 4)}%`,
                  background: 'linear-gradient(180deg,#60a5fa,#3b82f6)',
                }}
              />
            ))}
          </div>
          <div className="text-muted-foreground mt-2 flex justify-between text-[11px]">
            <span>14 dias atrás</span>
            <span>7 dias</span>
            <span>hoje</span>
          </div>
        </div>

        <div>
          <span className="text-muted-foreground text-[13px] font-semibold">
            Cliques por plataforma
          </span>
          <div className="mt-4 flex flex-col gap-3.5">
            {detail.links.map((l) => (
              <div key={l.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                    <span className="h-2.5 w-2.5 rounded" style={{ background: l.color }} />
                    {l.label}
                  </span>
                  <span className="text-muted-foreground text-[13px]">
                    <strong className="text-foreground">{nf(l.clicks)}</strong> · {l.pct}%
                  </span>
                </div>
                <div className="bg-secondary h-1.75 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${l.barPct}%`, background: l.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom domain */}
      <div className="border-t px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="text-muted-foreground h-4 w-4" />
          <span className="text-[13px] font-semibold">Domínio customizado</span>
          {detail.customDomain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <Check className="h-3 w-3" />
              Ativo
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="ex: amanda-zarayeva.com"
            className="font-mono text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveDomain}
            disabled={domainSaving || domainInput === (detail.customDomain ?? '')}
          >
            {domainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
        <DomainInstructions domain={domainInput} />
      </div>

      {/* Monetization */}
      <Monetization detail={detail} />
    </div>
  )
}

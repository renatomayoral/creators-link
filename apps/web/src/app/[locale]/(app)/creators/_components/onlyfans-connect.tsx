'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Unlink } from 'lucide-react'

type Props = { creatorId: string }

type OfStatus = {
  connected: boolean
  expired?: boolean
  handle?: string
  platformUserId?: string
  scopes?: string[]
}

type OfStats = {
  profile?: {
    username: string
    subscribersCount: number
    likesCount: number
    photosCount: number
    videosCount: number
  }
  earnings?: {
    totalGross: number
    totalNet: number
    currentBalance: number
    byType: {
      subscriptions: number
      tips: number
      messages: number
      posts: number
    }
  }
  subscribers?: {
    active: number
    expired: number
    new30d: number
  }
  fetchedAt?: string
}

const STEP_INSTRUCTIONS = [
  {
    n: 1,
    text: 'Instale a extensão "Cookie-Editor" no Chrome/Firefox',
    link: 'https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
    linkLabel: 'Instalar extensão',
  },
  { n: 2, text: 'Acesse onlyfans.com e faça login na conta da criadora' },
  {
    n: 3,
    text: 'Clique na extensão → "Export" → "Export as JSON" e copie tudo',
  },
  { n: 4, text: 'Cole abaixo e clique em Conectar' },
]

const money = (cents: number) =>
  `$${(cents / 100).toFixed(2)}`

export function OnlyFansConnect({ creatorId }: Props) {
  const qc = useQueryClient()
  const [cookies, setCookies] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: status, isLoading: statusLoading } = useQuery<OfStatus>({
    queryKey: ['of-status', creatorId],
    queryFn: async () => {
      const res = await fetch(`/api/onlyfans/session?creatorId=${creatorId}`)
      if (res.status === 404) return { connected: false }
      return res.json()
    },
  })

  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useQuery<OfStats>({
    queryKey: ['of-stats', creatorId],
    queryFn: () => fetch(`/api/onlyfans/stats?creatorId=${creatorId}`).then((r) => r.json()),
    enabled: status?.connected && !status.expired,
    staleTime: 5 * 60 * 1000, // 5 min cache
  })

  const connect = useMutation({
    mutationFn: (cookies: string) =>
      fetch('/api/onlyfans/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorId, cookies }),
      }).then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error ?? 'Erro ao conectar')
        return body
      }),
    onSuccess: () => {
      setCookies('')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['of-status', creatorId] })
      qc.invalidateQueries({ queryKey: ['of-stats', creatorId] })
    },
  })

  const disconnect = useMutation({
    mutationFn: () =>
      fetch(`/api/onlyfans/session?creatorId=${creatorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['of-status', creatorId] })
      qc.invalidateQueries({ queryKey: ['of-stats', creatorId] })
    },
  })

  if (statusLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-border" />
  }

  const isConnected = status?.connected && !status.expired

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* OF logo placeholder */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00aff0]/15 text-[10px] font-black text-[#00aff0]">
            OF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold">OnlyFans</span>
              {isConnected && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                  CONECTADO
                </span>
              )}
              {status?.expired && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-400">
                  EXPIRADO
                </span>
              )}
            </div>
            {isConnected && status?.handle && (
              <div className="text-[12px] text-muted-foreground">@{status.handle}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={() => refetchStats()}
              disabled={statsFetching}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statsFetching ? 'animate-spin' : ''}`} />
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400"
              title="Desconectar"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Connected: show stats */}
      {isConnected && stats && !stats.profile?.username ? null : isConnected && stats?.profile ? (
        <div className="p-4 space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Assinantes ativos" value={stats.subscribers?.active ?? 0} />
            <KpiCard label="Novos (30d)" value={stats.subscribers?.new30d ?? 0} plus />
            <KpiCard label="Saldo atual" value={money(stats.earnings?.currentBalance ?? 0)} />
          </div>

          {/* Earnings breakdown */}
          {stats.earnings && (
            <div className="rounded-xl border border-border bg-background p-3 space-y-1.5">
              <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Ganhos</div>
              {[
                ['Assinaturas', stats.earnings.byType.subscriptions],
                ['Tips', stats.earnings.byType.tips],
                ['Mensagens', stats.earnings.byType.messages],
                ['Posts PPV', stats.earnings.byType.posts],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-[12.5px]">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-mono font-semibold">{money(val as number)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 flex justify-between text-[12.5px]">
                <span className="font-semibold">Total bruto</span>
                <span className="font-mono font-bold">{money(stats.earnings.totalGross)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-muted-foreground">
                <span>Após taxa OF (80%)</span>
                <span className="font-mono text-emerald-400">{money(stats.earnings.totalNet)}</span>
              </div>
            </div>
          )}

          {stats.fetchedAt && (
            <p className="text-[11px] text-muted-foreground text-right">
              Atualizado {new Date(stats.fetchedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      ) : isConnected ? (
        <div className="flex items-center justify-center py-8 text-[13px] text-muted-foreground gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Carregando stats…
        </div>
      ) : null}

      {/* Expired: show re-auth prompt */}
      {status?.expired && !showForm && (
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-[12.5px] text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Sessão expirada. Re-exporte os cookies do OnlyFans e cole aqui.</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl bg-[#00aff0] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Not connected or showForm: cookie input */}
      {(!isConnected || showForm) && !status?.expired && (
        <div className="p-4 space-y-3">
          {/* Instructions */}
          <div className="space-y-2">
            {STEP_INSTRUCTIONS.map((s) => (
              <div key={s.n} className="flex gap-2.5 text-[12.5px]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00aff0]/15 text-[10.5px] font-bold text-[#00aff0]">
                  {s.n}
                </span>
                <span className="text-muted-foreground leading-5">
                  {s.text}
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1.5 inline-flex items-center gap-0.5 text-[#00aff0] hover:underline"
                    >
                      {s.linkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            placeholder='Cole aqui o JSON exportado: [{"name":"sess","value":"..."},...]'
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 font-mono text-[11.5px] outline-none focus:border-[#00aff0] placeholder:text-muted-foreground/50"
          />

          {connect.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2 text-[12.5px] text-red-400">
              {(connect.error as Error).message}
            </div>
          )}

          <button
            onClick={() => connect.mutate(cookies)}
            disabled={!cookies.trim() || connect.isPending}
            className="w-full rounded-xl bg-[#00aff0] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {connect.isPending ? 'Validando…' : 'Conectar OnlyFans'}
          </button>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, plus }: { label: string; value: string | number; plus?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className={`text-[17px] font-bold font-mono ${plus ? 'text-emerald-400' : ''}`}>
        {plus && typeof value === 'number' ? `+${value}` : value}
      </div>
    </div>
  )
}

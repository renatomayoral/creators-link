'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Unlink, ExternalLink, AlertTriangle } from 'lucide-react'

type Props = { creatorId: string }

type OfStatus = {
  connected: boolean
  expired?: boolean
  handle?: string
  platformUserId?: string
}

type OfStats = {
  profile?: { username: string; subscribersCount: number }
  earnings?: {
    totalGross: number
    totalNet: number
    currentBalance: number
    byType: { subscriptions: number; tips: number; messages: number; posts: number }
  }
  subscribers?: { active: number; expired: number; new30d: number }
  fetchedAt?: string
}

type BookmarkletData = { bookmarkletHref: string }

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function OnlyFansConnect({ creatorId }: Props) {
  const qc = useQueryClient()
  const [dragged, setDragged] = useState(false)
  const [reconnect, setReconnect] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Connection status
  const { data: status, isLoading: statusLoading } = useQuery<OfStatus>({
    queryKey: ['of-status', creatorId],
    queryFn: async () => {
      const res = await fetch(`/api/onlyfans/session?creatorId=${creatorId}`)
      if (res.status === 404) return { connected: false }
      return res.json()
    },
  })

  // Stats (only when connected)
  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useQuery<OfStats>({
    queryKey: ['of-stats', creatorId],
    queryFn: () => fetch(`/api/onlyfans/stats?creatorId=${creatorId}`).then((r) => r.json()),
    enabled: !!(status?.connected && !status.expired),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch bookmarklet href (generates one-time token)
  const {
    data: bookmarklet,
    refetch: refetchBookmarklet,
    isFetching: bookmarkletLoading,
  } = useQuery<BookmarkletData>({
    queryKey: ['of-bookmarklet', creatorId],
    queryFn: () =>
      fetch(`/api/onlyfans/bookmarklet-token?creatorId=${creatorId}`).then((r) => r.json()),
    enabled: !status?.connected || !!reconnect,
    staleTime: 10 * 60 * 1000, // token is valid 15 min, refetch at 10
  })

  // Poll for connection after the creator has dragged the bookmarklet
  // — they'll click it on OF and we need to detect when the session arrives
  useEffect(() => {
    if (!dragged) return
    pollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['of-status', creatorId] })
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [dragged, creatorId, qc])

  // Stop polling once connected
  useEffect(() => {
    if (status?.connected && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
      setDragged(false)
      setReconnect(false)
    }
  }, [status?.connected])

  const disconnect = useMutation({
    mutationFn: () =>
      fetch(`/api/onlyfans/session?creatorId=${creatorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['of-status', creatorId] })
      qc.invalidateQueries({ queryKey: ['of-stats', creatorId] })
    },
  })

  if (statusLoading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-border" />
  }

  const isConnected = status?.connected && !status.expired
  const showSetup = !isConnected || reconnect

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
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
            {isConnected && status.handle && (
              <div className="text-[12px] text-muted-foreground">@{status.handle}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isConnected && (
            <>
              <button
                onClick={() => refetchStats()}
                disabled={statsFetching}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Atualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${statsFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400"
                title="Desconectar"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Connected: stats */}
      {isConnected && !showSetup && (
        <div className="space-y-3 p-4">
          {stats ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <KpiCard label="Assinantes" value={stats.subscribers?.active ?? 0} />
                <KpiCard label="Novos 30d" value={stats.subscribers?.new30d ?? 0} plus />
                <KpiCard label="Saldo" value={money(stats.earnings?.currentBalance ?? 0)} />
              </div>

              {stats.earnings && (
                <div className="space-y-1.5 rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Ganhos
                  </div>
                  {(
                    [
                      ['Assinaturas', stats.earnings.byType.subscriptions],
                      ['Tips', stats.earnings.byType.tips],
                      ['Mensagens', stats.earnings.byType.messages],
                      ['Posts PPV', stats.earnings.byType.posts],
                    ] as [string, number][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-[12.5px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-semibold">{money(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-1.5 text-[12.5px]">
                    <span className="font-semibold">Total bruto</span>
                    <span className="font-mono font-bold">{money(stats.earnings.totalGross)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-muted-foreground">
                    <span>Após taxa OF (80%)</span>
                    <span className="font-mono text-emerald-400">
                      {money(stats.earnings.totalNet)}
                    </span>
                  </div>
                </div>
              )}

              {stats.fetchedAt && (
                <p className="text-right text-[11px] text-muted-foreground">
                  Atualizado {new Date(stats.fetchedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Carregando stats…
            </div>
          )}
        </div>
      )}

      {/* Expired warning */}
      {status?.expired && !reconnect && (
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-[12.5px] text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Sessão expirada. Reconecte clicando no favorito novamente.</span>
          </div>
          <button
            onClick={() => {
              setReconnect(true)
              refetchBookmarklet()
            }}
            className="w-full rounded-xl bg-[#00aff0] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Setup: bookmarklet */}
      {showSetup && !status?.expired && (
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            {/* Step 1 */}
            <Step n={1}>
              Acesse{' '}
              <a
                href="https://onlyfans.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[#00aff0] hover:underline"
              >
                onlyfans.com
                <ExternalLink className="h-3 w-3" />
              </a>{' '}
              e faça login normalmente
            </Step>

            {/* Step 2: drag target */}
            <Step n={2}>
              <span>Arraste este botão para a sua barra de favoritos:</span>
              <div className="mt-2">
                {bookmarkletLoading ? (
                  <div className="h-9 w-56 animate-pulse rounded-xl bg-border" />
                ) : bookmarklet?.bookmarkletHref ? (
                  <a
                    href={bookmarklet.bookmarkletHref}
                    draggable
                    onDragStart={() => setDragged(true)}
                    onClick={(e) => {
                      e.preventDefault()
                      alert(
                        'Arraste este botão para a barra de favoritos do seu browser, depois clique nele estando na página do OnlyFans.',
                      )
                    }}
                    className="inline-flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-[#00aff0]/50 bg-[#00aff0]/8 px-4 py-2 text-[13px] font-bold text-[#00aff0] select-none active:cursor-grabbing"
                  >
                    <span>⭐</span>
                    Conectar ao CreatorsLink
                  </a>
                ) : (
                  <button
                    onClick={() => refetchBookmarklet()}
                    className="text-[12.5px] text-[#00aff0] underline"
                  >
                    Gerar favorito
                  </button>
                )}
              </div>
            </Step>

            {/* Step 3 */}
            <Step n={3}>
              {dragged ? (
                <span className="font-semibold text-foreground">
                  Agora clique no favorito que você acabou de salvar — estando na página do OnlyFans
                </span>
              ) : (
                <span>Estando no OnlyFans, clique no favorito salvo</span>
              )}
            </Step>
          </div>

          {/* Polling indicator */}
          {dragged && (
            <div className="flex items-center gap-2 rounded-xl border border-[#00aff0]/20 bg-[#00aff0]/5 px-3 py-2.5 text-[12.5px] text-[#00aff0]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Aguardando conexão…
            </div>
          )}

          {/* Token refresh note */}
          <p className="text-[11px] text-muted-foreground">
            O favorito expira em 15 minutos.{' '}
            <button
              onClick={() => refetchBookmarklet()}
              className="underline hover:text-foreground"
            >
              Gerar novo
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00aff0]/15 text-[10.5px] font-bold text-[#00aff0]">
        {n}
      </span>
      <span className="text-[12.5px] text-muted-foreground leading-5">{children}</span>
    </div>
  )
}

function KpiCard({ label, value, plus }: { label: string; value: string | number; plus?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono text-[17px] font-bold ${plus ? 'text-emerald-400' : ''}`}>
        {plus && typeof value === 'number' ? `+${value}` : value}
      </div>
    </div>
  )
}

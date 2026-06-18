'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Unlink, ExternalLink, AlertTriangle } from 'lucide-react'

type Props = { creatorId: string }

type FanslyStatus = {
  connected: boolean
  expired?: boolean
  handle?: string
  platformUserId?: string
}

type FanslyStats = {
  handle?: string
  displayName?: string
  followers?: number | null
  subscribers?: number | null
  expired?: boolean
}

type BookmarkletData = { bookmarkletHref: string }

export function FanslyConnect({ creatorId }: Props) {
  const qc = useQueryClient()
  const [dragged, setDragged] = useState(false)
  const [reconnect, setReconnect] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: status, isLoading: statusLoading } = useQuery<FanslyStatus>({
    queryKey: ['fansly-status', creatorId],
    queryFn: async () => {
      const res = await fetch(`/api/fansly/session?creatorId=${creatorId}`)
      if (res.status === 404) return { connected: false }
      return res.json()
    },
  })

  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useQuery<FanslyStats>({
    queryKey: ['fansly-stats', creatorId],
    queryFn: () => fetch(`/api/fansly/stats?creatorId=${creatorId}`).then((r) => r.json()),
    enabled: !!(status?.connected && !status.expired),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: bookmarklet,
    refetch: refetchBookmarklet,
    isFetching: bookmarkletLoading,
  } = useQuery<BookmarkletData>({
    queryKey: ['fansly-bookmarklet', creatorId],
    queryFn: () =>
      fetch(`/api/fansly/bookmarklet-token?creatorId=${creatorId}`).then((r) => r.json()),
    enabled: !status?.connected || !!reconnect,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!dragged) return
    pollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['fansly-status', creatorId] })
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [dragged, creatorId, qc])

  useEffect(() => {
    if (status?.connected && !status.expired && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
      setDragged(false)
      setReconnect(false)
    }
  }, [status?.connected, status?.expired])

  const disconnect = useMutation({
    mutationFn: () =>
      fetch(`/api/fansly/session?creatorId=${creatorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fansly-status', creatorId] })
      qc.invalidateQueries({ queryKey: ['fansly-stats', creatorId] })
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9333ea]/15 text-[10px] font-black text-[#9333ea]">
            FY
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold">Fansly</span>
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
          {stats && !stats.expired ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <KpiCard label="Seguidores" value={stats.followers ?? '—'} />
                <KpiCard label="Assinantes" value={stats.subscribers ?? '—'} />
              </div>
              {stats.displayName && (
                <p className="text-[12px] text-muted-foreground">
                  {stats.displayName}
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
            className="w-full rounded-xl bg-[#9333ea] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Setup: bookmarklet */}
      {showSetup && !status?.expired && (
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <Step n={1} color="#9333ea">
              Acesse{' '}
              <a
                href="https://fansly.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[#9333ea] hover:underline"
              >
                fansly.com
                <ExternalLink className="h-3 w-3" />
              </a>{' '}
              e faça login normalmente
            </Step>

            <Step n={2} color="#9333ea">
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
                        'Arraste este botão para a barra de favoritos do seu browser, depois clique nele estando na página do Fansly.',
                      )
                    }}
                    className="inline-flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-[#9333ea]/50 bg-[#9333ea]/8 px-4 py-2 text-[13px] font-bold text-[#9333ea] select-none active:cursor-grabbing"
                  >
                    <span>⭐</span>
                    Conectar ao CreatorsLink
                  </a>
                ) : (
                  <button
                    onClick={() => refetchBookmarklet()}
                    className="text-[12.5px] text-[#9333ea] underline"
                  >
                    Gerar favorito
                  </button>
                )}
              </div>
            </Step>

            <Step n={3} color="#9333ea">
              {dragged ? (
                <span className="font-semibold text-foreground">
                  Agora clique no favorito que você acabou de salvar — estando na página do Fansly
                </span>
              ) : (
                <span>Estando no Fansly, clique no favorito salvo</span>
              )}
            </Step>
          </div>

          {dragged && (
            <div className="flex items-center gap-2 rounded-xl border border-[#9333ea]/20 bg-[#9333ea]/5 px-3 py-2.5 text-[12.5px] text-[#9333ea]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Aguardando conexão…
            </div>
          )}

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

function Step({
  n,
  color,
  children,
}: {
  n: number
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
        style={{ background: color }}
      >
        {n}
      </span>
      <span className="text-[12.5px] text-muted-foreground leading-5">{children}</span>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono text-[17px] font-bold">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </div>
    </div>
  )
}

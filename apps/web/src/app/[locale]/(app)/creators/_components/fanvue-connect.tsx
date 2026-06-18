'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'

type Props = { creatorId: string }

type FanvueStatus = {
  connected: boolean
  needsReauth?: boolean
  handle?: string
  platformUserId?: string
  scopes?: string[]
  connectedAt?: string
}

function FanvueLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#6d5dfc"/>
      <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

export function FanvueConnect({ creatorId }: Props) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [apiToken, setApiToken] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [savingToken, setSavingToken] = useState(false)

  const { data: status, isLoading } = useQuery<FanvueStatus>({
    queryKey: ['fanvue-status', creatorId],
    queryFn: () => fetch(`/api/fanvue/status?creatorId=${creatorId}`).then(r => r.json()),
  })

  const disconnect = useMutation({
    mutationFn: () =>
      fetch(`/api/fanvue/status?creatorId=${creatorId}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fanvue-status', creatorId] }),
  })

  async function saveApiToken() {
    if (!apiToken.trim()) return
    setSavingToken(true)
    try {
      await fetch(`/api/fanvue/status?creatorId=${creatorId}`, {
        method: 'GET', // just to check — token save is separate
      })
      // Save as manual api_token via a dedicated endpoint
      await fetch(`/api/fanvue/token?creatorId=${creatorId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiToken: apiToken.trim() }),
      })
      queryClient.invalidateQueries({ queryKey: ['fanvue-status', creatorId] })
      setShowTokenInput(false)
      setApiToken('')
    } finally {
      setSavingToken(false)
    }
  }

  // Show toast-like feedback from OAuth redirect
  const oauthResult = searchParams.get('fanvue')

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-border" />
  }

  if (status?.connected && !status.needsReauth) {
    return (
      <div className="rounded-2xl border border-[#6d5dfc]/25 bg-[#6d5dfc]/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FanvueLogo />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-bold">Fanvue</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                  CONECTADO
                </span>
              </div>
              {status.handle && (
                <div className="text-[12px] text-muted-foreground">@{status.handle}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-red-500/40 hover:text-red-400"
          >
            Desconectar
          </button>
        </div>

        {status.scopes && status.scopes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {status.scopes.filter(s => !['openid','offline_access','offline'].includes(s)).map(s => (
              <span key={s} className="rounded-full bg-background px-2 py-0.5 text-[10.5px] font-mono text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <FanvueLogo />
        <div>
          <div className="text-[13.5px] font-bold">Fanvue</div>
          <div className="text-[12px] text-muted-foreground">
            {status?.needsReauth ? 'Reconexão necessária' : 'Não conectado'}
          </div>
        </div>
      </div>

      {oauthResult === 'error' && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2 text-[12.5px] text-red-400">
          Erro ao conectar. Tente novamente.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* OAuth button — primary */}
        <a
          href={`/api/fanvue/connect?creatorId=${creatorId}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#6d5dfc] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <FanvueLogo size={15} />
          {status?.needsReauth ? 'Reconectar com Fanvue' : 'Conectar com Fanvue'}
        </a>

        {/* Manual token fallback */}
        <button
          onClick={() => setShowTokenInput(v => !v)}
          className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {showTokenInput ? 'Cancelar' : 'Usar API token manualmente'}
        </button>

        {showTokenInput && (
          <div className="mt-1 flex gap-2">
            <input
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder="Cole seu API token do Fanvue"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-[12.5px] outline-none focus:border-[#6d5dfc]"
            />
            <button
              onClick={saveApiToken}
              disabled={!apiToken.trim() || savingToken}
              className="rounded-xl bg-[#6d5dfc] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

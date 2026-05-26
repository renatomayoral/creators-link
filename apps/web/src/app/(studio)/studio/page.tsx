'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Power, AlertCircle, WifiOff } from 'lucide-react'

type Phase =
  | 'checking'   // verifying VM status
  | 'starting'   // VM is stopped — calling /api/vm/start
  | 'tunneling'  // VM running — establishing SSH tunnel
  | 'ready'      // tunnel up — show ComfyUI iframe
  | 'offline'    // VM went offline while in use
  | 'error'

const POLL_INTERVAL_MS = 5_000
const HEALTH_CHECK_MS  = 30_000   // check VM still alive every 30s while ready

export default function StudioPage() {
  const [phase, setPhase]   = useState<Phase>('checking')
  const [error, setError]   = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTick = () => {
    setElapsed(0)
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
  }
  const stopTick = () => {
    if (tickRef.current) clearInterval(tickRef.current)
  }

  /** Poll /api/vm/status until `target` status is reached */
  const waitForStatus = (target: string) =>
    new Promise<void>((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        try {
          const res  = await fetch('/api/vm/status')
          const data = await res.json()
          if (data.status === target) {
            clearInterval(pollRef.current!)
            resolve()
          }
        } catch { /* keep polling */ }
      }, POLL_INTERVAL_MS)

      setTimeout(() => {
        clearInterval(pollRef.current!)
        reject(new Error('VM took too long to start (10 min timeout)'))
      }, 10 * 60 * 1000)
    })

  /** Health-check loop: detects when idle-shutdown powers off the VM */
  const startHealthCheck = useCallback(() => {
    healthRef.current = setInterval(async () => {
      try {
        const res  = await fetch('/api/vm/status')
        const data = await res.json()
        if (data.status === 'STOPPED' || data.status === 'UNKNOWN') {
          clearInterval(healthRef.current!)
          setPhase('offline')
        }
      } catch { /* network hiccup — keep checking */ }
    }, HEALTH_CHECK_MS)
  }, [])

  const checkAndBoot = useCallback(async () => {
    setError(null)
    try {
      // 1. Check VM status
      setPhase('checking')
      const statusRes  = await fetch('/api/vm/status')
      const statusData = await statusRes.json()
      const vmStatus: string = statusData.status ?? 'UNKNOWN'

      if (vmStatus !== 'RUNNING') {
        // 2. Start the VM
        setPhase('starting')
        startTick()
        await fetch('/api/vm/start', { method: 'POST' })
        await waitForStatus('RUNNING')
        stopTick()
      }

      // 3. Establish SSH tunnel
      setPhase('tunneling')
      startTick()
      const tunnelRes = await fetch('/api/comfyui/tunnel', { method: 'POST' })
      if (!tunnelRes.ok) {
        const d = await tunnelRes.json()
        throw new Error(d.error ?? 'Tunnel failed')
      }
      stopTick()

      // 4. Ready — show iframe and start health checks
      setPhase('ready')
      startHealthCheck()
    } catch (err) {
      stopTick()
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHealthCheck])

  useEffect(() => {
    checkAndBoot()
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current)
      if (healthRef.current) clearInterval(healthRef.current)
      stopTick()
    }
  }, [checkAndBoot])

  // ─── Ready: full-screen ComfyUI iframe ──────────────────────────────────────
  if (phase === 'ready') {
    return (
      <iframe
        src="/api/comfyui/"
        className="h-full w-full border-0"
        title="ComfyUI Studio"
        allow="clipboard-read; clipboard-write"
      />
    )
  }

  // ─── Loading / Error / Offline states ───────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-neutral-950 text-white">

      {phase === 'offline' && (
        <>
          <WifiOff className="h-12 w-12 text-amber-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-400">VM desligou por inatividade</p>
            <p className="mt-1 text-sm text-neutral-400">
              O servidor GPU foi desligado automaticamente após 30 min sem uso.
            </p>
          </div>
          <button
            onClick={checkAndBoot}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 transition-colors"
          >
            <Power className="h-4 w-4" />
            Religar VM
          </button>
        </>
      )}

      {phase === 'error' && (
        <>
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-red-400">Falha ao iniciar studio</p>
            <p className="mt-1 text-sm text-neutral-400">{error}</p>
          </div>
          <button
            onClick={checkAndBoot}
            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Tentar novamente
          </button>
        </>
      )}

      {(phase === 'checking' || phase === 'starting' || phase === 'tunneling') && (
        <>
          <div className="relative">
            <Power className="h-10 w-10 text-neutral-400" />
            <Loader2 className="absolute -right-4 -top-4 h-6 w-6 animate-spin text-violet-400" />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {phase === 'checking'  && 'Verificando VM…'}
              {phase === 'starting'  && 'Ligando GPU VM…'}
              {phase === 'tunneling' && 'Conectando ao ComfyUI…'}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {phase === 'starting'  && `Geralmente leva 2–3 minutos · ${elapsed}s`}
              {phase === 'tunneling' && elapsed < 15
                ? `Conectando via SSH · ${elapsed}s`
                : phase === 'tunneling' && elapsed < 60
                ? `VM iniciando, aguardando SSH… · ${elapsed}s`
                : `Aguardando ComfyUI subir na VM · ${elapsed}s`}
              {phase === 'checking'  && 'Aguarde um momento'}
            </p>
          </div>

          {phase === 'starting' && (
            <div className="w-64 overflow-hidden rounded-full bg-white/10 h-1.5">
              <div
                className="h-full bg-violet-500 transition-all duration-1000"
                style={{ width: `${Math.min((elapsed / 180) * 100, 95)}%` }}
              />
            </div>
          )}

          {phase === 'starting' && (
            <p className="text-xs text-neutral-500">
              💡 A VM desliga sozinha após 30 min sem uso para economizar
            </p>
          )}
        </>
      )}
    </div>
  )
}

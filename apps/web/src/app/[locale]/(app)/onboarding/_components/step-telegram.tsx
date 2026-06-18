'use client'

import { useState } from 'react'
import type { OnboardingState } from './onboarding-wizard'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

export function StepTelegram({ state, updateState, onNext, onBack }: Props) {
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!token.trim() || !state.creatorId) { onNext(); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/creators/${state.creatorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ telegramBotToken: token.trim() }),
      })
      if (!res.ok) { setError('Erro ao salvar o token. Verifique e tente novamente.'); return }
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Bot do Telegram</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure um bot para gerenciar o acesso ao canal VIP da criadora no Telegram.
        </p>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-[13.5px] font-semibold">Como criar o bot:</p>
        <ol className="flex flex-col gap-3">
          {[
            <>Abra o Telegram e inicie uma conversa com <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">@BotFather</a></>,
            <>Envie o comando <code className="rounded bg-accent px-1.5 py-0.5 text-[12.5px]">/newbot</code></>,
            <>Escolha um nome e um username para o bot (ex: <code className="rounded bg-accent px-1.5 py-0.5 text-[12.5px]">BabiVIPBot</code>)</>,
            <>Copie o <strong>token de acesso</strong> que o BotFather enviar e cole abaixo</>,
            <>Adicione o bot como <strong>administrador</strong> no canal VIP da criadora</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-black text-blue-400">
                {i + 1}
              </span>
              <span className="text-[13px] text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Token input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold">Token do bot</label>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none transition-colors focus:border-blue-500"
        />
        <span className="text-[12px] text-muted-foreground">
          Formato: <code>números:letras</code> — fornecido pelo @BotFather
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onNext} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Pular por agora
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
          >
            {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>}
            Salvar e continuar →
          </button>
        </div>
      </div>
    </div>
  )
}

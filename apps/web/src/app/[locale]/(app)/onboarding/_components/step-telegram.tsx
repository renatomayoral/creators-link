'use client'

import { useState } from 'react'
import type { OnboardingState } from './onboarding-wizard'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '@CreatorsLinkBot'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'error'

const PAYMENT_OPTIONS = [
  { key: 'stripe', label: 'Stripe', desc: 'Cartão de crédito internacional (USD/EUR)', color: '#635bff' },
  { key: 'pix_auto', label: 'Pix Automático', desc: 'Débito recorrente via C6 Bank (BRL)', color: '#00c274' },
  { key: 'pix_manual', label: 'Pix Manual', desc: 'QR Code gerado a cada cobrança (BRL)', color: '#00c274' },
]

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
]

export function StepTelegram({ state, updateState, onNext, onBack }: Props) {
  // Channel connect
  const [channelUsername, setChannelUsername] = useState('')
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [channelTitle, setChannelTitle] = useState<string | null>(null)
  const [channelError, setChannelError] = useState<string | null>(null)

  // Channel photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Payment methods
  const [payments, setPayments] = useState<Set<string>>(new Set())

  // Pix key
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('cpf')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasAnyPix = payments.has('pix_auto') || payments.has('pix_manual')

  async function handleVerify() {
    if (!channelUsername.trim() || !state.creatorId) return
    setVerifyState('loading')
    setChannelError(null)
    try {
      const res = await fetch('/api/telegram/verify-channel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorId: state.creatorId, channelUsername: channelUsername.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setChannelError(data.error ?? 'Erro ao verificar.'); setVerifyState('error'); return }
      setChannelTitle(data.channelTitle)
      setVerifyState('success')
    } catch {
      setChannelError('Erro de conexão. Tente novamente.')
      setVerifyState('error')
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !state.creatorId) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/upload/channel-photo?creatorId=${state.creatorId}`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) setPhotoUrl(data.url)
    } finally {
      setUploading(false)
    }
  }

  function togglePayment(key: string) {
    setPayments(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleSave() {
    if (!state.creatorId) { onNext(); return }
    setSaving(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = {
        acceptedPayments: [...payments],
      }
      if (hasAnyPix && pixKey.trim()) {
        body.pixKey = pixKey.trim()
        body.pixKeyType = pixKeyType
      }
      await fetch(`/api/creators/${state.creatorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      onNext()
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Canal VIP no Telegram</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure o canal privado, a foto e os meios de pagamento aceitos.
        </p>
      </div>

      {/* ── 1. Connect channel ── */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold uppercase tracking-widest text-muted-foreground">1. Conectar canal</h3>
        <div className="rounded-2xl border border-border bg-card p-5">
          <ol className="flex flex-col gap-3 mb-4">
            {[
              <>Crie um canal privado no Telegram com o nome e foto que quiser</>,
              <>Adicione <code className="rounded bg-accent px-1.5 py-0.5 text-[12.5px] font-mono">{BOT_USERNAME}</code> como <strong>administrador</strong> do canal</>,
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-black text-blue-400">{i + 1}</span>
                <span className="text-[13px] text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <input
              value={channelUsername}
              onChange={e => { setChannelUsername(e.target.value); setVerifyState('idle'); setChannelError(null) }}
              placeholder="@babibarelli_vip ou t.me/babibarelli_vip"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500"
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={!channelUsername.trim() || verifyState === 'loading'}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {verifyState === 'loading' && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
              Verificar
            </button>
          </div>
          {verifyState === 'success' && channelTitle && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-2.5 text-[13px] font-semibold text-emerald-400">
              ✓ {channelTitle} conectado
            </div>
          )}
          {channelError && (
            <p className="mt-3 text-[12.5px] text-red-400">{channelError}</p>
          )}
        </div>
      </section>

      {/* ── 2. Channel photo ── */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold uppercase tracking-widest text-muted-foreground">2. Foto do canal <span className="normal-case font-normal opacity-60">(opcional)</span></h3>
        <div className="flex items-center gap-5">
          <label className="relative cursor-pointer">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-accent transition-colors hover:border-blue-500">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : uploading ? (
                <svg className="h-6 w-6 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              )}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} />
          </label>
          <div className="text-[13px] text-muted-foreground">
            <p className="font-medium text-foreground">Foto do canal VIP</p>
            <p>JPG, PNG ou WebP · máx. 5MB</p>
            <p className="mt-1">Aplicada automaticamente no canal do Telegram.</p>
          </div>
        </div>
      </section>

      {/* ── 3. Payment methods ── */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold uppercase tracking-widest text-muted-foreground">3. Meios de pagamento</h3>
        <div className="flex flex-col gap-2">
          {PAYMENT_OPTIONS.map(opt => {
            const on = payments.has(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => togglePayment(opt.key)}
                className={[
                  'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
                  on ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-border/60 hover:bg-accent/30',
                ].join(' ')}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: opt.color }} />
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold">{opt.label}</p>
                  <p className="text-[12px] text-muted-foreground">{opt.desc}</p>
                </div>
                <div className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  on ? 'border-blue-500 bg-blue-500 text-white text-[10px]' : 'border-border',
                ].join(' ')}>
                  {on && '✓'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Pix key — shown only if any Pix selected */}
        {hasAnyPix && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-[13.5px] font-semibold">Chave Pix para recebimento</p>
            <p className="text-[12.5px] text-muted-foreground -mt-2">Os repasses serão enviados para esta chave após split automático.</p>
            <div className="flex gap-2">
              <select
                value={pixKeyType}
                onChange={e => setPixKeyType(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-500"
              >
                {PIX_KEY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'email' ? 'email@exemplo.com' : pixKeyType === 'phone' ? '+55 11 99999-9999' : 'Cole a chave aqui'}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {saveError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
          {saveError}
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
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
          >
            {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
            Salvar e continuar →
          </button>
        </div>
      </div>
    </div>
  )
}

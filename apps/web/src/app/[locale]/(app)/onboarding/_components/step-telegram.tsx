'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { OnboardingState } from './onboarding-wizard'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '@CreatorsLinkBot'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

type Mode = 'choose' | 'create' | 'connect'
type Status = 'idle' | 'loading' | 'success' | 'error'

const PAYMENT_OPTIONS = [
  { key: 'stripe',        label: 'Stripe',        desc: 'Cartão de crédito internacional (USD/EUR), assinatura recorrente', color: '#635bff' },
  { key: 'stripe_crypto', label: 'Stripe Crypto', desc: 'Stablecoins via Stripe — pagamento avulso por período',            color: '#f7931a' },
]

const PIX_KEY_TYPES = [
  { value: 'cpf',    label: 'CPF' },
  { value: 'cnpj',   label: 'CNPJ' },
  { value: 'email',  label: 'E-mail' },
  { value: 'phone',  label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
]

export function StepTelegram({ state, updateState, onNext, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('choose')

  // Create mode
  const [channelTitle, setChannelTitle] = useState('')
  const [channelDesc, setChannelDesc] = useState('')
  const [creatorTgUsername, setCreatorTgUsername] = useState('')
  const [createStatus, setCreateStatus] = useState<Status>('idle')
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null)

  // Connect mode
  const [channelUsername, setChannelUsername] = useState('')
  const [connectStatus, setConnectStatus] = useState<Status>('idle')
  const [connectedTitle, setConnectedTitle] = useState<string | null>(null)

  // Shared
  const [error, setError] = useState<string | null>(null)
  const channelDone = createStatus === 'success' || connectStatus === 'success'

  // Photo upload
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !state.creatorId) return
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoUploading(true)
    setPhotoError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('creatorId', state.creatorId)
      const res = await fetch('/api/upload/channel-photo', { method: 'POST', body: form })
      const d = await res.json()
      if (!res.ok) { setPhotoError(d.error ?? 'Erro no upload') }
      else if (d.path) setUploadedPhotoPath(d.path)
    } catch {
      setPhotoError('Erro de conexão.')
    } finally {
      setPhotoUploading(false)
    }
  }

  // Payment methods
  const [payments, setPayments] = useState<Set<string>>(new Set())
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('cpf')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const hasAnyPix = payments.has('pix_auto') || payments.has('pix_manual')

  // ── Create channel ──────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!channelTitle.trim() || !state.creatorId) return
    setCreateStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/telegram/create-channel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creatorId: state.creatorId,
          title: channelTitle.trim(),
          description: channelDesc.trim() || undefined,
          photoPath: uploadedPhotoPath ?? undefined,
          creatorUsername: creatorTgUsername.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar o canal.'); setCreateStatus('error'); return }
      setCreatedInviteLink(data.inviteLink)
      setCreateStatus('success')
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setCreateStatus('error')
    }
  }

  // ── Connect existing channel ────────────────────────────────────────────────

  async function handleConnect() {
    if (!channelUsername.trim() || !state.creatorId) return
    setConnectStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/telegram/verify-channel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorId: state.creatorId, channelUsername: channelUsername.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao verificar.'); setConnectStatus('error'); return }
      setConnectedTitle(data.channelTitle)
      setConnectStatus('success')
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setConnectStatus('error')
    }
  }

  // ── Save payment config + advance ──────────────────────────────────────────

  function togglePayment(key: string) {
    setPayments(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleSave() {
    if (!state.creatorId) { onNext(); return }
    setSaving(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = { acceptedPayments: [...payments] }
      if (hasAnyPix && pixKey.trim()) { body.pixKey = pixKey.trim(); body.pixKeyType = pixKeyType }
      await fetch(`/api/creators/${state.creatorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      updateState({ acceptedPayments: [...payments] })
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
          Configure o canal privado e os meios de pagamento aceitos.
        </p>
      </div>

      {/* ── 1. Canal ── */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold uppercase tracking-widest text-muted-foreground">1. Canal VIP</h3>

        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('create')}
              className="flex flex-col gap-2 rounded-2xl border-2 border-border p-5 text-left hover:border-blue-500 hover:bg-blue-500/5 transition-all"
            >
              <span className="text-2xl">✨</span>
              <p className="text-[14px] font-bold">Criar agora</p>
              <p className="text-[12px] text-muted-foreground">Criamos o canal automaticamente para você. Só dê um nome.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('connect')}
              className="flex flex-col gap-2 rounded-2xl border-2 border-border p-5 text-left hover:border-blue-500 hover:bg-blue-500/5 transition-all"
            >
              <span className="text-2xl">🔗</span>
              <p className="text-[14px] font-bold">Conectar existente</p>
              <p className="text-[12px] text-muted-foreground">Já tem um canal? Adicione {BOT_USERNAME} como admin e conecte.</p>
            </button>
          </div>
        )}

        {/* Create mode */}
        {mode === 'create' && (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold">Criar canal automaticamente</p>
              <button type="button" onClick={() => { setMode('choose'); setCreateStatus('idle'); setError(null) }}
                className="text-[12px] text-muted-foreground hover:text-foreground">
                ← voltar
              </button>
            </div>

            {createStatus !== 'success' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold">Foto de perfil do canal</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-accent/30 hover:border-blue-500 hover:bg-blue-500/5 transition-all"
                    >
                      {photoPreview ? (
                        <Image src={photoPreview} alt="Foto do canal" fill className="object-cover" />
                      ) : (
                        <span className="text-xl">📷</span>
                      )}
                      {photoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                          </svg>
                        </div>
                      )}
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-fit rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-accent transition-colors"
                      >
                        {photoPreview ? 'Trocar foto' : 'Selecionar foto'}
                      </button>
                      <p className="text-[11.5px] text-muted-foreground">JPG ou PNG, mínimo 160×160px</p>
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  </div>
                  {photoError && <p className="text-[12px] text-red-400">{photoError}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold">Nome do canal <span className="text-red-400">*</span></label>
                  <input
                    value={channelTitle}
                    onChange={e => setChannelTitle(e.target.value)}
                    placeholder="VIP da Babi 🔥"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <input
                    value={channelDesc}
                    onChange={e => setChannelDesc(e.target.value)}
                    placeholder="Conteúdo exclusivo para assinantes VIP"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold">
                    Seu @username no Telegram <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    value={creatorTgUsername}
                    onChange={e => setCreatorTgUsername(e.target.value)}
                    placeholder="@babibarelli"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="text-[11.5px] text-muted-foreground">Se informado, você será adicionada como administradora do canal.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!channelTitle.trim() || createStatus === 'loading'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
                >
                  {createStatus === 'loading' && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
                  {createStatus === 'loading' ? 'Criando canal…' : 'Criar canal'}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
                  <span className="text-emerald-400 text-lg">✓</span>
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-400">Canal criado com sucesso!</p>
                    <p className="text-[12px] text-muted-foreground">{channelTitle} · {BOT_USERNAME} já é admin</p>
                  </div>
                </div>
                {createdInviteLink && (
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-[12px] font-semibold text-muted-foreground mb-1">Link de convite para a criadora:</p>
                    <a href={createdInviteLink} target="_blank" rel="noopener noreferrer"
                      className="text-[12.5px] text-blue-400 break-all hover:underline">
                      {createdInviteLink}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Connect mode */}
        {mode === 'connect' && (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold">Conectar canal existente</p>
              <button type="button" onClick={() => { setMode('choose'); setConnectStatus('idle'); setError(null) }}
                className="text-[12px] text-muted-foreground hover:text-foreground">
                ← voltar
              </button>
            </div>
            <p className="text-[12.5px] text-muted-foreground -mt-2">
              Adicione <code className="rounded bg-accent px-1.5 py-0.5 font-mono">{BOT_USERNAME}</code> como administrador do canal, depois cole o username abaixo.
            </p>
            <div className="flex gap-2">
              <input
                value={channelUsername}
                onChange={e => { setChannelUsername(e.target.value); setConnectStatus('idle'); setError(null) }}
                placeholder="@babibarelli_vip ou t.me/babibarelli_vip"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
              <button type="button" onClick={handleConnect}
                disabled={!channelUsername.trim() || connectStatus === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40">
                {connectStatus === 'loading' && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
                Verificar
              </button>
            </div>
            {connectStatus === 'success' && connectedTitle && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-2.5 text-[13px] font-semibold text-emerald-400">
                ✓ {connectedTitle} conectado
              </div>
            )}
          </div>
        )}

        {error && <p className="text-[12.5px] text-red-400">{error}</p>}
      </section>

      {/* ── 2. Meios de pagamento ── */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold uppercase tracking-widest text-muted-foreground">2. Meios de pagamento</h3>
        <div className="flex flex-col gap-2">
          {PAYMENT_OPTIONS.map(opt => {
            const on = payments.has(opt.key)
            return (
              <button key={opt.key} type="button" onClick={() => togglePayment(opt.key)}
                className={['flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
                  on ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-border/60 hover:bg-accent/30'].join(' ')}>
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: opt.color }} />
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold">{opt.label}</p>
                  <p className="text-[12px] text-muted-foreground">{opt.desc}</p>
                </div>
                <div className={['flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  on ? 'border-blue-500 bg-blue-500 text-white text-[10px]' : 'border-border'].join(' ')}>
                  {on && '✓'}
                </div>
              </button>
            )
          })}
        </div>

        {hasAnyPix && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-[13.5px] font-semibold">Chave Pix para recebimento</p>
            <p className="text-[12.5px] text-muted-foreground -mt-2">Os repasses serão enviados para esta chave após split automático.</p>
            <div className="flex gap-2">
              <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                {PIX_KEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input value={pixKey} onChange={e => setPixKey(e.target.value)}
                placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'email' ? 'email@exemplo.com' : pixKeyType === 'phone' ? '+55 11 99999-9999' : 'Cole a chave aqui'}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        )}
      </section>

      {saveError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">{saveError}</div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onNext} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Pular por agora
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40">
            {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
            Salvar e continuar →
          </button>
        </div>
      </div>
    </div>
  )
}

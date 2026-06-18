'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { OnboardingState } from './onboarding-wizard'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  handle: z.string().max(60).optional(),
})
type FormData = z.infer<typeof schema>

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function StepCreator({ state, updateState, onNext, onBack }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const name = watch('name') ?? ''
  const slug = slugify(name)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) setAvatarUrl(data.url)
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          handle: data.handle || `@${slug.replace(/-/g, '')}`,
          avatarUrl: avatarUrl ?? undefined,
          platformKeys: state.selectedPlatforms,
        }),
      })
      if (!res.ok) { setError('Erro ao criar a criadora. Tente novamente.'); return }
      const { id, slug: creatorSlug } = await res.json()

      // advance onboarding step in DB
      await fetch('/api/onboarding/platforms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platforms: state.selectedPlatforms }),
      })

      updateState({ creatorId: id, creatorSlug })
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Criar primeira criadora</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie a página de links da sua primeira criadora. Você pode editar tudo depois.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-accent transition-colors hover:border-blue-500">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : uploading ? (
              <svg className="h-5 w-5 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
          <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
        </label>
        <div className="text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">Foto da criadora</p>
          <p>JPG, PNG ou WebP · máx. 2MB</p>
          <p>Opcional — pode adicionar depois</p>
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold">Nome da criadora <span className="text-red-400">*</span></label>
        <input
          {...register('name')}
          placeholder="Ex: Babi Barelli"
          className={[
            'w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500',
            errors.name ? 'border-red-400' : 'border-border',
          ].join(' ')}
        />
        {errors.name && <span className="text-[12px] text-red-400">{errors.name.message}</span>}
        {slug && !errors.name && (
          <span className="text-[12px] text-muted-foreground">
            Página: <span className="font-mono text-foreground">/p/{slug}</span>
          </span>
        )}
      </div>

      {/* Handle */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold">@ Handle <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <input
          {...register('handle')}
          placeholder="@babibarelli"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500"
        />
      </div>

      {/* Platforms selected */}
      {state.selectedPlatforms.length > 0 && (
        <div className="rounded-xl border border-border bg-accent/30 px-4 py-3">
          <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Links adicionados automaticamente:</p>
          <div className="flex flex-wrap gap-1.5">
            {state.selectedPlatforms.map(key => (
              <span key={key} className="rounded-full bg-background px-2.5 py-1 text-[11.5px] font-medium capitalize">
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
        >
          {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>}
          Criar criadora →
        </button>
      </div>
    </form>
  )
}

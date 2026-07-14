'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, Palette, Smartphone, Monitor } from 'lucide-react'
import { PAGE_TEMPLATES, resolveConfig, type PageConfig } from '@/lib/page-templates'
import { PublicProfileView, type PublicProfileLink } from '@/components/public-profile-view'
import type { PublicVipPlan } from '@/app/p/[slug]/vip-plans'
import type { CreatorDetail } from '@/lib/creators'

type Props = { creatorId: string; slug: string; creator: CreatorDetail }
type DesignState = { pageTemplate: string; pageConfig: Partial<PageConfig> | null }
type PreviewMode = 'mobile' | 'desktop'

const COLOR_FIELDS: { key: keyof PageConfig; label: string }[] = [
  { key: 'accentColor', label: 'Cor de destaque' },
  { key: 'bgFrom', label: 'Fundo (início)' },
  { key: 'bgTo', label: 'Fundo (fim)' },
  { key: 'textColor', label: 'Texto principal' },
  { key: 'mutedColor', label: 'Texto secundário' },
]

const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System (padrão)' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
  { value: "'Inter', system-ui", label: 'Inter' },
  { value: "'Playfair Display', Georgia, serif", label: 'Playfair (elegante)' },
]

const BUTTON_STYLES = [
  { value: 'pill', label: 'Pill' },
  { value: 'rounded', label: 'Arredondado' },
  { value: 'sharp', label: 'Reto' },
] as const

export function TabPageDesign({ creatorId, slug, creator }: Props) {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [localTemplate, setLocalTemplate] = useState<string | null>(null)
  const [localConfig, setLocalConfig] = useState<Partial<PageConfig> | null>(null)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('mobile')

  const { data, isLoading } = useQuery<DesignState>({
    queryKey: ['page-design', creatorId],
    queryFn: () => fetch(`/api/creators/${creatorId}/page-design`).then((r) => r.json()),
  })

  const { data: plans = [] } = useQuery<PublicVipPlan[]>({
    queryKey: ['creator-plans', creatorId],
    queryFn: () => fetch(`/api/creators/${creatorId}/plans`).then((r) => r.json()),
  })

  const activeTemplate = localTemplate ?? data?.pageTemplate ?? 'neon-dark'
  const activeOverrides = localConfig ?? data?.pageConfig ?? null
  const resolved = resolveConfig(activeTemplate, activeOverrides)

  const previewLinks: PublicProfileLink[] = creator.links.map((l) => ({
    id: l.id,
    platform: l.platform,
    label: l.label,
    url: l.url,
  }))

  const mutation = useMutation({
    mutationFn: (body: Partial<DesignState>) =>
      fetch(`/api/creators/${creatorId}/page-design`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page-design', creatorId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleSave = useCallback(() => {
    mutation.mutate({ pageTemplate: activeTemplate, pageConfig: activeOverrides ?? {} })
  }, [activeTemplate, activeOverrides, mutation])

  function patchConfig(patch: Partial<PageConfig>) {
    setLocalConfig((prev) => ({ ...(prev ?? {}), ...patch }))
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px]">
    <div className="divide-y lg:border-r">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-[14px] font-semibold">Design da Página Pública</h2>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir página
          </a>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            aria-label="Salvar design da página"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {saved ? (
              <><Check className="h-3.5 w-3.5" aria-hidden="true" /> Salvo!</>
            ) : mutation.isPending ? (
              'Salvando…'
            ) : (
              'Salvar Design'
            )}
          </button>
        </div>
      </div>

      {/* Template grid */}
      <section className="px-5 py-4" aria-labelledby="templates-heading">
        <h3 id="templates-heading" className="mb-3 text-[11.5px] font-bold uppercase tracking-widest text-muted-foreground">
          Template
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PAGE_TEMPLATES.map((t) => {
            const cfg = resolveConfig(t.id)
            const isSelected = activeTemplate === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setLocalTemplate(t.id); setLocalConfig(null) }}
                aria-label={`${t.name} — ${t.description}`}
                aria-pressed={isSelected}
                className={[
                  'relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {/* Mini preview */}
                <div
                  className="h-14 w-full overflow-hidden rounded-lg"
                  aria-hidden="true"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.bgFrom}, ${cfg.bgTo})` }}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-1">
                    <div
                      className="h-5 w-5 rounded-full border-2"
                      style={{ borderColor: cfg.accentColor, background: cfg.bgFrom }}
                    />
                    <div className="h-1 w-8 rounded-full" style={{ background: cfg.textColor, opacity: 0.7 }} />
                    <div className="h-1 w-5 rounded-full" style={{ background: cfg.mutedColor, opacity: 0.5 }} />
                    <div
                      className="mt-1 h-3 w-10"
                      style={{
                        background: cfg.accentColor,
                        opacity: 0.85,
                        borderRadius: cfg.buttonStyle === 'pill' ? 99 : cfg.buttonStyle === 'sharp' ? 2 : 6,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10.5px] font-semibold leading-tight">{t.name}</span>
                {isSelected && (
                  <div
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Color overrides */}
      <section className="px-5 py-4" aria-labelledby="colors-heading">
        <h3 id="colors-heading" className="mb-3 text-[11.5px] font-bold uppercase tracking-widest text-muted-foreground">
          Cores
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COLOR_FIELDS.map(({ key, label }) => {
            const rawValue = (activeOverrides as Record<string, string> | null)?.[key] as string | undefined
            const displayValue = rawValue ?? (resolved[key] as string)
            const isHex = /^#[0-9a-fA-F]{3,8}$/.test(displayValue)
            const inputId = `color-${key}`
            return (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-[11.5px] font-medium text-muted-foreground">
                  {label}
                </label>
                <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                  {isHex ? (
                    <input
                      type="color"
                      id={inputId}
                      value={displayValue}
                      onChange={(e) => patchConfig({ [key]: e.target.value } as Partial<PageConfig>)}
                      aria-label={label}
                      className="h-5 w-5 cursor-pointer rounded border-none bg-transparent p-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded border" style={{ background: displayValue }} aria-hidden="true" />
                  )}
                  <input
                    type="text"
                    value={rawValue ?? ''}
                    placeholder={displayValue}
                    onChange={(e) => patchConfig({ [key]: e.target.value } as Partial<PageConfig>)}
                    aria-label={`${label} (valor em texto)`}
                    className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Font + button style + glow */}
      <section className="px-5 py-4" aria-labelledby="style-heading">
        <h3 id="style-heading" className="mb-3 text-[11.5px] font-bold uppercase tracking-widest text-muted-foreground">
          Tipografia & Botões
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="font-select" className="text-[11.5px] font-medium text-muted-foreground">
              Fonte
            </label>
            <select
              id="font-select"
              value={(activeOverrides as Partial<PageConfig> | null)?.fontFamily ?? resolved.fontFamily}
              onChange={(e) => patchConfig({ fontFamily: e.target.value })}
              className="rounded-lg border bg-background px-2 py-2 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-muted-foreground" id="btn-style-label">
              Estilo dos botões
            </span>
            <div className="flex gap-1.5" role="group" aria-labelledby="btn-style-label">
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => patchConfig({ buttonStyle: s.value })}
                  aria-pressed={resolved.buttonStyle === s.value}
                  className={[
                    'flex-1 rounded-lg border py-2 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    resolved.buttonStyle === s.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-accent',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label
            htmlFor="glow-range"
            className="text-[11.5px] font-medium text-muted-foreground"
          >
            Intensidade do glow —{' '}
            <span className="tabular-nums">
              {Math.round(((activeOverrides as Partial<PageConfig> | null)?.glowOpacity ?? resolved.glowOpacity) * 100)}%
            </span>
          </label>
          <input
            id="glow-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={(activeOverrides as Partial<PageConfig> | null)?.glowOpacity ?? resolved.glowOpacity}
            onChange={(e) => patchConfig({ glowOpacity: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10.5px] text-muted-foreground">
            <span>Sem glow</span>
            <span>Máximo</span>
          </div>
        </div>
      </section>
    </div>

    {/* Live preview column */}
    <div className="flex flex-col items-center gap-3 bg-muted/30 px-4 py-5">
      <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5" role="group" aria-label="Modo de pré-visualização">
        <button
          onClick={() => setPreviewMode('mobile')}
          aria-pressed={previewMode === 'mobile'}
          className={[
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            previewMode === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          Mobile
        </button>
        <button
          onClick={() => setPreviewMode('desktop')}
          aria-pressed={previewMode === 'desktop'}
          className={[
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            previewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          Desktop
        </button>
      </div>

      <div
        className={[
          'overflow-hidden bg-black shadow-xl transition-all',
          previewMode === 'mobile'
            ? 'h-152.5 w-[375px] max-w-full rounded-[2.5rem] border-8 border-neutral-800'
            : 'h-152.5 w-full rounded-2xl border',
        ].join(' ')}
      >
        <div className="h-full w-full overflow-y-auto">
          <PublicProfileView
            mode="preview"
            cfg={resolved}
            creator={{
              name: creator.name,
              handle: creator.handle,
              bio: creator.bio,
              avatarUrl: creator.avatarUrl,
            }}
            links={previewLinks}
            plans={plans}
          />
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Pré-visualização ao vivo — os links não são clicáveis aqui.
      </p>
    </div>
    </div>
  )
}

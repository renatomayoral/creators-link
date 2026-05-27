'use client'

import { useEffect, useState, useId, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs'
import { Button } from '@repo/ui/components/button'
import { Textarea } from '@repo/ui/components/textarea'
import { Label } from '@repo/ui/components/label'
import { Slider } from '@repo/ui/components/slider'
import { Progress } from '@repo/ui/components/progress'
import { Badge } from '@repo/ui/components/badge'
import { useToast } from '@repo/ui/hooks/use-toast'
import {
  Wand2, Loader2, Power, AlertCircle, WifiOff, CheckCircle2,
  ChevronDown, Shuffle, ImageIcon, VideoIcon, Sparkles, Download,
} from 'lucide-react'
import { useVmStore, type VmPhase } from '@/lib/vm-store'
import { cn } from '@repo/ui/lib/utils'

// ── Schema ──────────────────────────────────────────────────────────────────

const generateSchema = z.object({
  prompt:         z.string().min(3, 'Prompt deve ter ao menos 3 caracteres'),
  negativePrompt: z.string().optional(),
  width:          z.number().min(256).max(2048),
  height:         z.number().min(256).max(2048),
  steps:          z.number().min(1).max(100),
  cfg:            z.number().min(1).max(30),
  seed:           z.number(),
  frames:         z.number().min(16).max(200).optional(),
})

type GenerateForm = z.infer<typeof generateSchema>

type JobStatus = {
  status:      'pending' | 'running' | 'completed' | 'failed'
  percentage?: number
  outputUrl?:  string
  outputType?: 'image' | 'video'
}

// ── Resolution presets ───────────────────────────────────────────────────────

const IMAGE_PRESETS = [
  { label: 'Retrato',   w: 832,  h: 1216, icon: '▯' },
  { label: 'Quadrado',  w: 1024, h: 1024, icon: '▢' },
  { label: 'Paisagem',  w: 1216, h: 832,  icon: '▭' },
  { label: 'Wide',      w: 1344, h: 768,  icon: '▬' },
] as const

const VIDEO_PRESETS = [
  { label: '16:9',  w: 832, h: 480, icon: '▬' },
  { label: '9:16',  w: 480, h: 832, icon: '▯' },
  { label: '1:1',   w: 480, h: 480, icon: '▢' },
] as const

const FRAME_PRESETS = [
  { label: '~2s',  frames: 49  },
  { label: '~3s',  frames: 73  },
  { label: '~4s',  frames: 97  },
] as const

// ── Page ────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const { phase, error, elapsed, boot } = useVmStore()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const activeTab    = searchParams.get('tab') ?? 'flux'
  const setActiveTab = (tab: string) => router.replace(`/studio?tab=${tab}`, { scroll: false })

  useEffect(() => {
    if (phase === 'idle' || phase === 'offline' || phase === 'error') void boot()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [genProgress,    setGenProgress]   = useState(0)
  const [isGenerating,   setIsGenerating]  = useState(false)
  const [resultUrl,      setResultUrl]     = useState<string | null>(null)
  const [resultType,     setResultType]    = useState<'image' | 'video'>('image')
  const [advancedOpen,   setAdvancedOpen]  = useState(false)
  const { toast } = useToast()

  const isVideo = activeTab !== 'flux'

  const form = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      prompt:         '',
      negativePrompt: '',
      width:          832,
      height:         1216,
      steps:          20,
      cfg:            3.5,
      seed:           Math.floor(Math.random() * 2 ** 32),
      frames:         49,
    },
  })

  // Reset resolution to model defaults when switching tabs
  useEffect(() => {
    if (isVideo) {
      form.setValue('width', 832)
      form.setValue('height', 480)
      form.setValue('frames', 49)
    } else {
      form.setValue('width', 832)
      form.setValue('height', 1216)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const { mutate: generate } = useMutation({
    mutationFn: async (data: GenerateForm) => {
      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, model: activeTab }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Falha ao submeter job')
      }
      return (await res.json()) as { jobId: string }
    },
    onMutate: () => {
      setIsGenerating(true)
      setGenProgress(0)
      setResultUrl(null)
    },
    onSuccess: ({ jobId }) => {
      const es = new EventSource(`/api/generate/${jobId}/status`)
      es.onmessage = (e) => {
        const data = JSON.parse(e.data as string) as JobStatus
        if (data.percentage !== undefined) setGenProgress(data.percentage)
        if (data.status === 'completed' && data.outputUrl) {
          es.close()
          setGenProgress(100)
          setResultUrl(data.outputUrl)
          setResultType(data.outputType ?? 'image')
          setIsGenerating(false)
          toast({ title: 'Geração concluída! 🎉' })
        }
        if (data.status === 'failed') {
          es.close()
          setIsGenerating(false)
          toast({ title: 'Falha na geração', description: 'Verifique os logs da VM.', variant: 'destructive' })
        }
      }
      es.onerror = () => { es.close(); setIsGenerating(false) }
    },
    onError: (err) => {
      setIsGenerating(false)
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    },
  })

  // Cmd/Ctrl+Enter to generate
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      form.handleSubmit((d) => generate(d))()
    }
  }, [form, generate])

  const values  = form.watch()
  const vmReady = phase === 'ready'

  return (
    <div className="flex flex-col gap-4 h-full" onKeyDown={handleKeyDown}>

      {/* ── VM status banner ── */}
      <VmBanner phase={phase} error={error} elapsed={elapsed} onRetry={() => void boot()} />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 flex-1 min-h-0">

        {/* ── Left: preview panel ── */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Studio</h1>

          <ResultPanel
            resultUrl={resultUrl}
            resultType={resultType}
            isGenerating={isGenerating}
            genProgress={genProgress}
            isVideo={isVideo}
            width={values.width}
            height={values.height}
          />
        </div>

        {/* ── Right: controls panel ── */}
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="flux" className="gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Imagem
              </TabsTrigger>
              <TabsTrigger value="wan-t2v" className="gap-1.5 text-xs">
                <VideoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Vídeo T2V
              </TabsTrigger>
              <TabsTrigger value="wan-i2v" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Animar
              </TabsTrigger>
            </TabsList>

            <form
              onSubmit={form.handleSubmit((d) => generate(d))}
              className="space-y-4 mt-4"
            >
              <TabsContent value="flux"    className="mt-0">
                <ControlsPanel form={form} isVideo={false} advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen} />
              </TabsContent>
              <TabsContent value="wan-t2v" className="mt-0">
                <ControlsPanel form={form} isVideo advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen} />
              </TabsContent>
              <TabsContent value="wan-i2v" className="mt-0">
                <ControlsPanel form={form} isVideo advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen} />
              </TabsContent>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isGenerating || !vmReady}
                aria-label={isGenerating ? `Gerando, ${genProgress}% concluído` : 'Gerar'}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Gerando… {genProgress}%
                  </>
                ) : !vmReady ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Aguardando GPU…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Gerar
                    <kbd className="ml-auto text-[10px] opacity-40 font-mono hidden sm:inline">⌘↵</kbd>
                  </>
                )}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({
  resultUrl, resultType, isGenerating, genProgress, isVideo, width, height,
}: {
  resultUrl:    string | null
  resultType:   'image' | 'video'
  isGenerating: boolean
  genProgress:  number
  isVideo:      boolean
  width:        number
  height:       number
}) {
  const aspectRatio = `${width} / ${height}`

  return (
    <div
      className="relative flex-1 min-h-90 rounded-xl bg-neutral-900 border border-white/8 overflow-hidden flex items-center justify-center"
      style={{ aspectRatio }}
    >
      {/* Generating overlay */}
      {isGenerating && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950/80 backdrop-blur-sm z-10"
          aria-live="polite"
          aria-label={`Gerando, ${genProgress}% concluído`}
        >
          <div className="w-48 space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Gerando…</span>
              <span aria-hidden="true">{genProgress}%</span>
            </div>
            <Progress value={genProgress} className="h-1" />
          </div>
          <p className="text-xs text-neutral-500">
            {genProgress < 10 ? 'Carregando modelos…' :
             genProgress < 90 ? 'Processando…' :
             'Finalizando…'}
          </p>
        </div>
      )}

      {/* Result */}
      {resultUrl && !isGenerating ? (
        <div className="relative w-full h-full group">
          {resultType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultUrl}
              alt="Imagem gerada"
              className="w-full h-full object-contain"
              width={width}
              height={height}
            />
          ) : (
            <video
              src={resultUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          )}
          {/* Download overlay */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => window.open(resultUrl, '_blank')}
              className="flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-black/90 transition-colors"
              aria-label="Download do resultado"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download
            </button>
          </div>
        </div>
      ) : !isGenerating ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 text-neutral-600 select-none pointer-events-none">
          {isVideo ? (
            <VideoIcon className="h-12 w-12" aria-hidden="true" />
          ) : (
            <ImageIcon className="h-12 w-12" aria-hidden="true" />
          )}
          <p className="text-sm">O resultado aparece aqui</p>
        </div>
      ) : null}

      {/* Aspect ratio badge */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="text-[10px] font-mono text-neutral-600 bg-neutral-900/80 px-1.5 py-0.5 rounded">
          {width}×{height}
        </span>
      </div>
    </div>
  )
}

// ── Controls panel ───────────────────────────────────────────────────────────

function ControlsPanel({
  form, isVideo, advancedOpen, setAdvancedOpen,
}: {
  form:             ReturnType<typeof useForm<GenerateForm>>
  isVideo:          boolean
  advancedOpen:     boolean
  setAdvancedOpen:  (v: boolean) => void
}) {
  const { register, watch, setValue, formState: { errors } } = form
  const values     = watch()
  const promptId   = useId()
  const negPromptId = useId()
  const seedId     = useId()

  const presets   = isVideo ? VIDEO_PRESETS : IMAGE_PRESETS
  const activePreset = presets.find((p) => p.w === values.width && p.h === values.height)

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={promptId} className="text-sm font-medium">Prompt</Label>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {values.prompt?.length ?? 0}/2000
          </span>
        </div>
        <Textarea
          id={promptId}
          placeholder="Descreva o que deseja gerar…"
          rows={4}
          autoFocus
          className="resize-none text-sm"
          autoComplete="off"
          {...register('prompt')}
        />
        {errors.prompt && (
          <p className="text-xs text-destructive" role="alert">{errors.prompt.message}</p>
        )}
      </div>

      {/* Negative prompt (collapsed by default via details) */}
      <details className="group">
        <summary className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer list-none select-none transition-colors">
          <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" aria-hidden="true" />
          Prompt Negativo
        </summary>
        <div className="mt-2">
          <Textarea
            id={negPromptId}
            placeholder="O que evitar na geração…"
            rows={2}
            className="resize-none text-sm"
            autoComplete="off"
            {...register('negativePrompt')}
          />
        </div>
      </details>

      {/* Resolution presets */}
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400 uppercase tracking-wide">Resolução</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((p) => (
            <button
              key={`${p.w}x${p.h}`}
              type="button"
              onClick={() => { setValue('width', p.w); setValue('height', p.h) }}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all',
                activePreset?.w === p.w && activePreset?.h === p.h
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-white/8 bg-white/3 text-neutral-400 hover:border-white/20 hover:text-neutral-200',
              )}
              aria-pressed={activePreset?.w === p.w && activePreset?.h === p.h}
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span>{p.label}</span>
              <span className="text-[9px] opacity-60">{p.w}×{p.h}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Frames (video only) */}
      {isVideo && (
        <div className="space-y-2">
          <Label className="text-xs text-neutral-400 uppercase tracking-wide">Duração</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {FRAME_PRESETS.map((fp) => (
              <button
                key={fp.frames}
                type="button"
                onClick={() => setValue('frames', fp.frames)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                  values.frames === fp.frames
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-white/8 bg-white/3 text-neutral-400 hover:border-white/20 hover:text-neutral-200',
                )}
                aria-pressed={values.frames === fp.frames}
              >
                {fp.label}
                <span className="block text-[9px] opacity-60 mt-0.5">{fp.frames} frames</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced settings */}
      <details open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer list-none select-none transition-colors">
          <ChevronDown className="h-3 w-3 transition-transform open:rotate-180" aria-hidden="true" />
          Configurações avançadas
        </summary>

        <div className="mt-3 space-y-4 pl-1">
          <SliderField
            label={`Steps: ${values.steps}`}
            hint="Mais steps = mais qualidade, mais lento"
            min={1} max={60} step={1}
            value={values.steps}
            onChange={(v) => setValue('steps', v)}
          />
          <SliderField
            label={`CFG: ${values.cfg}`}
            hint="Aderência ao prompt (3–7 para FLUX, 5–8 para Wan)"
            min={1} max={20} step={0.5}
            value={values.cfg}
            onChange={(v) => setValue('cfg', v)}
          />

          {/* Seed */}
          <div className="space-y-1.5">
            <Label htmlFor={seedId} className="text-sm">Seed</Label>
            <div className="flex items-center gap-2">
              <input
                id={seedId}
                type="number"
                autoComplete="off"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono tabular-nums focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                {...register('seed', { valueAsNumber: true })}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                onClick={() => setValue('seed', Math.floor(Math.random() * 2 ** 32))}
                aria-label="Gerar seed aleatória"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

// ── Slider field ──────────────────────────────────────────────────────────────

function SliderField({
  label, hint, min, max, step, value, onChange,
}: {
  label:    string
  hint?:    string
  min:      number
  max:      number
  step:     number
  value:    number
  onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm tabular-nums">{label}</Label>
        {hint && <span className="text-[10px] text-neutral-500">{hint}</span>}
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      />
    </div>
  )
}

// ── VM status banner ──────────────────────────────────────────────────────────

function VmBanner({
  phase, error, elapsed, onRetry,
}: {
  phase:   VmPhase
  error:   string | null
  elapsed: number
  onRetry: () => void
}) {
  if (phase === 'ready' || phase === 'idle') return null

  if (phase === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          GPU desligou por inatividade
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none transition-colors"
          aria-label="Religar GPU"
        >
          <Power className="h-3 w-3" aria-hidden="true" />
          Religar
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div
        role="alert"
        className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error ?? 'Falha ao iniciar GPU'}</span>
        </div>
        <button
          onClick={onRetry}
          className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none transition-colors"
          aria-label="Tentar conectar novamente"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // checking / starting / tunneling
  const label =
    phase === 'checking'  ? 'Verificando GPU…' :
    phase === 'starting'  ? `Ligando GPU… ${elapsed}s` :
    /* tunneling */         `Conectando… ${elapsed}s`

  const progress = phase === 'starting' ? Math.min((elapsed / 180) * 100, 95) : null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex items-center gap-3 rounded-lg bg-white/4 border border-white/8 px-4 py-2.5 text-sm text-neutral-400"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
      {progress !== null && (
        <div className="ml-auto w-28">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  )
}

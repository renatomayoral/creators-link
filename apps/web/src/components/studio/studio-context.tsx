'use client'

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@repo/ui/hooks/use-toast'
import { useVmStore } from '@/lib/vm-store'
import { createFLUXWorkflow, createWanT2VWorkflow, createWanI2VWorkflow } from '@repo/comfyui-client/workflows'
import { generateSchema, type GenerateForm, type JobStatus } from './studio-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

type ComfyNode = { class_type: string; inputs: Record<string, unknown> }
type ComfyWf   = Record<string, ComfyNode>

/** Extract form field values from a parsed ComfyUI workflow JSON */
function extractFormValues(tab: string, wf: ComfyWf): Partial<GenerateForm> {
  const str  = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined
  const num  = (v: unknown): number | undefined => typeof v === 'number' ? v : undefined

  if (tab === 'flux') {
    // node '4' = CLIPTextEncode (prompt)
    // node '5' = FluxGuidance   (cfg via guidance)
    // node '7' = EmptyLatentImage (width, height)
    // node '8' = KSampler        (steps, seed)
    return {
      prompt:  str(wf['4']?.inputs?.text),
      cfg:     num(wf['5']?.inputs?.guidance),
      width:   num(wf['7']?.inputs?.width),
      height:  num(wf['7']?.inputs?.height),
      steps:   num(wf['8']?.inputs?.steps),
      seed:    num(wf['8']?.inputs?.seed),
    }
  }

  if (tab === 'wan-t2v') {
    // node '4' = CLIPTextEncode positive
    // node '5' = CLIPTextEncode negative
    // node '6' = WanImageToVideo (width, height, length→frames)
    // node '7' = KSampler        (steps, cfg, seed)
    return {
      prompt:         str(wf['4']?.inputs?.text),
      negativePrompt: str(wf['5']?.inputs?.text),
      width:          num(wf['6']?.inputs?.width),
      height:         num(wf['6']?.inputs?.height),
      frames:         num(wf['6']?.inputs?.length),
      steps:          num(wf['7']?.inputs?.steps),
      cfg:            num(wf['7']?.inputs?.cfg),
      seed:           num(wf['7']?.inputs?.seed),
    }
  }

  if (tab === 'wan-i2v') {
    // node '5' = CLIPTextEncode positive
    // node '6' = CLIPTextEncode negative
    // node '7' = WanImageToVideo (width, height, length→frames)
    // node '8' = KSampler        (steps, cfg, seed)
    return {
      prompt:         str(wf['5']?.inputs?.text),
      negativePrompt: str(wf['6']?.inputs?.text),
      width:          num(wf['7']?.inputs?.width),
      height:         num(wf['7']?.inputs?.height),
      frames:         num(wf['7']?.inputs?.length),
      steps:          num(wf['8']?.inputs?.steps),
      cfg:            num(wf['8']?.inputs?.cfg),
      seed:           num(wf['8']?.inputs?.seed),
    }
  }

  return {}
}

/** Build a formatted workflow JSON string from current form values */
function buildWorkflowJson(modelTab: string, values: GenerateForm): string {
  try {
    let wf
    if (modelTab === 'flux') {
      wf = createFLUXWorkflow(values)
    } else if (modelTab === 'wan-t2v') {
      wf = createWanT2VWorkflow({ ...values, frames: values.frames ?? 49 })
    } else {
      wf = createWanI2VWorkflow({ ...values, frames: values.frames ?? 49, imageBase64: '' })
    }
    return JSON.stringify(wf, null, 2)
  } catch {
    return '{}'
  }
}

// ── Context interface ─────────────────────────────────────────────────────────

type StudioState = {
  activeTab:    string
  isVideo:      boolean
  isGenerating: boolean
  genProgress:  number
  resultUrl:    string | null
  resultType:   'image' | 'video'
  advancedOpen: boolean
  vmReady:      boolean
  form:         UseFormReturn<GenerateForm>
  values:       GenerateForm
  rawJson:      string       // derived: override ?? computed from form
  jsonError:    string | null
  jsonDirty:    boolean      // true when user has manually edited this tab's JSON
}

type StudioActions = {
  setActiveTab:    (tab: string) => void
  submit:          () => void
  setAdvancedOpen: (v: boolean) => void
  setRawJson:      (json: string) => void
  refreshJson:     () => void
  syncFromJson:    () => void   // parse rawJson and push values back into the form
}

type StudioContextValue = {
  state:   StudioState
  actions: StudioActions
}

// ── Context ───────────────────────────────────────────────────────────────────

const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio(): StudioContextValue {
  const ctx = use(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within <StudioProvider>')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const { phase, boot } = useVmStore()
  const router          = useRouter()
  const searchParams    = useSearchParams()
  const { toast }       = useToast()

  // Boot VM once on mount (idempotent — store guards duplicate calls)
  useEffect(() => {
    if (phase === 'idle' || phase === 'offline' || phase === 'error') void boot()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tab state via URL so links/back-button work
  // Valid tabs: flux | wan-t2v | wan-i2v (no separate 'json' tab anymore)
  const rawTab   = searchParams.get('tab') ?? 'flux'
  const activeTab = ['flux', 'wan-t2v', 'wan-i2v'].includes(rawTab) ? rawTab : 'flux'
  const isVideo   = activeTab === 'wan-t2v' || activeTab === 'wan-i2v'

  // Per-tab JSON overrides: null = not edited, string = user's edited version
  const [rawJsonOverrides, setRawJsonOverrides] = useState<Record<string, string | null>>({})
  const [jsonError,        setJsonError]        = useState<string | null>(null)

  // Re-validate the current tab's override whenever activeTab changes
  useEffect(() => {
    const override = rawJsonOverrides[activeTab]
    if (!override) { setJsonError(null); return }
    try   { JSON.parse(override); setJsonError(null) }
    catch (e) { setJsonError(e instanceof Error ? e.message : 'JSON inválido') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Generation state
  const [genProgress,  setGenProgress]  = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [resultUrl,    setResultUrl]    = useState<string | null>(null)
  const [resultType,   setResultType]   = useState<'image' | 'video'>('image')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Form — Provider is the sole owner; children read via context
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

  const values  = form.watch()
  const vmReady = phase === 'ready'

  // When switching tabs: reset resolution defaults
  useEffect(() => {
    if (activeTab === 'flux') {
      form.setValue('width',  832)
      form.setValue('height', 1216)
    } else {
      form.setValue('width',  832)
      form.setValue('height', 480)
      form.setValue('frames', 49)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Derived rawJson: user override if present, otherwise computed from form
  const rawJson = useMemo(() => {
    const override = rawJsonOverrides[activeTab]
    if (override != null) return override
    return buildWorkflowJson(activeTab, values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rawJsonOverrides[activeTab], values])

  const jsonDirty = (rawJsonOverrides[activeTab] ?? null) !== null

  // Edit JSON for the current tab
  const handleSetRawJson = useCallback((json: string) => {
    setRawJsonOverrides(prev => ({ ...prev, [activeTab]: json }))
    try   { JSON.parse(json); setJsonError(null) }
    catch (e) { setJsonError(e instanceof Error ? e.message : 'JSON inválido') }
  }, [activeTab])

  // Discard override and go back to computed workflow
  const refreshJson = useCallback(() => {
    setRawJsonOverrides(prev => ({ ...prev, [activeTab]: null }))
    setJsonError(null)
  }, [activeTab])

  const setActiveTab = useCallback(
    (tab: string) => router.replace(`/studio?tab=${tab}`, { scroll: false }),
    [router],
  )

  const { mutate: generate } = useMutation({
    mutationFn: async (data: GenerateForm) => {
      const override = rawJsonOverrides[activeTab]
      let body: Record<string, unknown> = { ...data, model: activeTab }

      if (override != null) {
        let parsed: unknown
        try {
          parsed = JSON.parse(override)
        } catch (e) {
          throw new Error(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`)
        }
        body = { ...data, model: activeTab, rawWorkflow: parsed }
      }

      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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

  // Parse rawJson and push recognised fields back into the form
  const syncFromJson = useCallback(() => {
    const override = rawJsonOverrides[activeTab]
    if (!override) return
    let wf: ComfyWf
    try {
      wf = JSON.parse(override) as ComfyWf
    } catch {
      toast({ title: 'JSON inválido', description: 'Corrija o JSON antes de salvar.', variant: 'destructive' })
      return
    }
    const extracted = extractFormValues(activeTab, wf)
    for (const [key, val] of Object.entries(extracted)) {
      if (val !== undefined) {
        form.setValue(key as keyof GenerateForm, val as never)
      }
    }
    toast({ title: 'Configurações atualizadas a partir do JSON' })
  }, [activeTab, rawJsonOverrides, form, toast])

  // submit: if JSON dirty, skip form validation (raw workflow goes as-is)
  const submit = useCallback(() => {
    if (jsonDirty) {
      generate(form.getValues())
    } else {
      form.handleSubmit((d) => generate(d))()
    }
  }, [jsonDirty, form, generate])

  return (
    <StudioContext value={{
      state: {
        activeTab,
        isVideo,
        isGenerating,
        genProgress,
        resultUrl,
        resultType,
        advancedOpen,
        vmReady,
        form,
        values,
        rawJson,
        jsonError,
        jsonDirty,
      },
      actions: {
        setActiveTab,
        submit,
        setAdvancedOpen,
        setRawJson: handleSetRawJson,
        refreshJson,
        syncFromJson,
      },
    }}>
      {children}
    </StudioContext>
  )
}

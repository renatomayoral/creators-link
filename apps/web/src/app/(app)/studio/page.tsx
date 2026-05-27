'use client'

import { useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@repo/ui/components/collapsible'
import { Button } from '@repo/ui/components/button'
import { ImageIcon, VideoIcon, Sparkles, Wand2, Loader2, Braces, ChevronDown } from 'lucide-react'
import { StudioProvider, useStudio } from '@/components/studio/studio-context'
import { VmBanner }      from '@/components/studio/vm-banner'
import { ResultPanel }   from '@/components/studio/result-panel'
import { ControlsPanel } from '@/components/studio/controls-panel'
import { JsonPanel }     from '@/components/studio/json-panel'

// ── Tab metadata ──────────────────────────────────────────────────────────────

const TAB_META: Record<string, { label: string; sub: string }> = {
  'flux':    { label: 'FLUX.2',  sub: 'Imagem' },
  'wan-t2v': { label: 'Wan 2.2', sub: 'Vídeo T2V' },
  'wan-i2v': { label: 'Wan 2.2', sub: 'Animar I2V' },
}

// ── Collapsible JSON section (one per tab) ────────────────────────────────────

function JsonSection() {
  const [open, setOpen] = useState(false)
  const { state: { jsonDirty, jsonError } } = useStudio()

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 text-xs text-neutral-500 hover:text-neutral-300 px-1"
        >
          <span className="flex items-center gap-1.5">
            <Braces className="h-3.5 w-3.5" aria-hidden="true" />
            Workflow JSON
            {jsonDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="modificado" />
            )}
            {jsonError && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-label="erro de JSON" />
            )}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <JsonPanel />
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Inner layout (needs context) ──────────────────────────────────────────────

function StudioLayout() {
  const {
    state:   { activeTab, isGenerating, genProgress, vmReady, form, jsonError, jsonDirty },
    actions: { setActiveTab, submit },
  } = useStudio()

  // Cmd/Ctrl+Enter to generate from anywhere on the page
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }, [submit])

  const jsonInvalid = jsonDirty && jsonError !== null

  const meta = TAB_META[activeTab] ?? TAB_META['flux']!

  return (
    <div className="flex flex-col gap-4 h-full" onKeyDown={handleKeyDown}>

      {/* VM status banner — hidden when ready */}
      <VmBanner />

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 flex-1 min-h-0">

        {/* Left: preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Studio</h1>
            <span className="text-sm text-muted-foreground">
              {meta.label}
              <span className="mx-1 opacity-40">·</span>
              {meta.sub}
            </span>
          </div>
          <ResultPanel />
        </div>

        {/* Right: controls */}
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="flux" className="gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Imagem
              </TabsTrigger>
              <TabsTrigger value="wan-t2v" className="gap-1.5 text-xs">
                <VideoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                T2V
              </TabsTrigger>
              <TabsTrigger value="wan-i2v" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                I2V
              </TabsTrigger>
            </TabsList>

            <form
              onSubmit={form.handleSubmit(() => submit())}
              className="space-y-4 mt-4"
            >
              <TabsContent value="flux" className="mt-0 space-y-4">
                <ControlsPanel />
                <JsonSection />
              </TabsContent>
              <TabsContent value="wan-t2v" className="mt-0 space-y-4">
                <ControlsPanel />
                <JsonSection />
              </TabsContent>
              <TabsContent value="wan-i2v" className="mt-0 space-y-4">
                <ControlsPanel />
                <JsonSection />
              </TabsContent>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isGenerating || !vmReady || jsonInvalid}
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
                ) : jsonInvalid ? (
                  <>
                    <Braces className="h-4 w-4 mr-2" aria-hidden="true" />
                    JSON inválido
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

// ── Page (wraps with provider) ────────────────────────────────────────────────

export default function StudioPage() {
  return (
    <StudioProvider>
      <StudioLayout />
    </StudioProvider>
  )
}

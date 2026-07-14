'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Globe, Loader2, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@repo/ui/components/input'
import { Textarea } from '@repo/ui/components/textarea'
import { Button } from '@repo/ui/components/button'
import { useToast } from '@repo/ui/hooks/use-toast'
import { type CreatorDetail } from '@/lib/creators'
import { DomainInstructions } from './domain-instructions'
import { OnlyFansConnect } from './onlyfans-connect'
import { FanslyConnect } from './fansly-connect'
import { FanvueConnect } from './fanvue-connect'
import { PatreonConnect } from './patreon-connect'

type Props = { detail: CreatorDetail }

const BIO_MAX = 280

export function TabSettings({ detail }: Props) {
  const t = useTranslations()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [domainInput, setDomainInput] = useState(detail.customDomain ?? '')
  const [domainSaving, setDomainSaving] = useState(false)
  const [bioInput, setBioInput] = useState(detail.bio ?? '')
  const [bioSaving, setBioSaving] = useState(false)

  async function saveBio() {
    setBioSaving(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bio: bioInput.trim() || null }),
      })
      if (!res.ok) throw new Error('Erro ao salvar descrição')
      toast({ title: 'Descrição salva!' })
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBioSaving(false)
    }
  }

  async function saveDomain() {
    setDomainSaving(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/domain`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customDomain: domainInput.trim() || null }),
      })
      const body = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok)
        throw new Error(typeof body.error === 'string' ? body.error : 'Erro ao salvar domínio')
      toast({
        title: domainInput.trim()
          ? t('creators.toastDomainSaved')
          : t('creators.toastDomainRemoved'),
      })
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setDomainSaving(false)
    }
  }

  return (
    <div className="divide-y">
      {/* Bio / description */}
      <section className="px-5 py-4" aria-labelledby="bio-heading">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="bio-heading" className="text-[14px] font-semibold">
            Descrição
          </h2>
        </div>
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Aparece na página pública, abaixo do nome. Emojis são bem-vindos 🔥
        </p>
        <label htmlFor="bio-textarea" className="sr-only">
          Descrição da página pública
        </label>
        <Textarea
          id="bio-textarea"
          value={bioInput}
          onChange={(e) => setBioInput(e.target.value.slice(0, BIO_MAX))}
          placeholder="Brazilian model & digital creator. Exclusive photos, videos & AI art — everything below 🔥"
          rows={3}
          className="resize-none text-[13.5px]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {bioInput.length}/{BIO_MAX}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={saveBio}
            disabled={bioSaving || bioInput === (detail.bio ?? '')}
            aria-label="Salvar descrição"
          >
            {bioSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Salvando…" />
            ) : (
              t('creators.save')
            )}
          </Button>
        </div>
      </section>

      {/* Custom domain */}
      <section className="px-5 py-4" aria-labelledby="domain-heading">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="domain-heading" className="text-[14px] font-semibold">
            {t('creators.customDomain')}
          </h2>
          {detail.customDomain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t('creators.statusLive')}
            </span>
          )}
        </div>
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Aponte um domínio próprio para a página pública desta criadora. Configure o DNS após salvar.
        </p>
        <div className="flex gap-2">
          <label htmlFor="domain-input" className="sr-only">
            Domínio customizado
          </label>
          <Input
            id="domain-input"
            type="url"
            autoComplete="url"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder={t('creators.domainPlaceholder')}
            className="font-mono text-sm"
            spellCheck={false}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveDomain}
            disabled={domainSaving || domainInput === (detail.customDomain ?? '')}
            aria-label="Salvar domínio customizado"
          >
            {domainSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Salvando…" />
            ) : (
              t('creators.save')
            )}
          </Button>
        </div>
        <DomainInstructions domain={domainInput} />
      </section>

      {/* Connected platforms */}
      <section className="px-5 py-4" aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" className="mb-3 text-[14px] font-semibold">
          Plataformas conectadas
        </h2>
        <p className="mb-4 text-[12.5px] text-muted-foreground">
          Conecte contas de plataformas de conteúdo para sincronizar dados automaticamente.
        </p>
        <div className="flex flex-col gap-3">
          <OnlyFansConnect
            creatorId={detail.id}
            initialConnection={detail.platformConnections.find((p) => p.platform === 'onlyfans')}
          />
          <FanslyConnect
            creatorId={detail.id}
            initialConnection={detail.platformConnections.find((p) => p.platform === 'fansly')}
          />
          <FanvueConnect
            creatorId={detail.id}
            initialConnection={detail.platformConnections.find((p) => p.platform === 'fanvue')}
          />
          <PatreonConnect
            creatorId={detail.id}
            initialConnection={detail.platformConnections.find((p) => p.platform === 'patreon')}
          />
        </div>
      </section>
    </div>
  )
}

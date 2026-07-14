'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ArrowLeft, Trash2, ExternalLink, BarChart2, Palette, Banknote, Settings2 } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog'
import { type CreatorDetail } from '@/lib/creators'
import { Avatar } from '../_components/avatar'
import { TabOverview } from '../_components/tab-overview'
import { TabPageDesign } from '../_components/tab-page-design'
import { TabMonetization } from '../_components/tab-monetization'
import { TabSettings } from '../_components/tab-settings'

type Tab = 'overview' | 'design' | 'monetization' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
  { id: 'design', label: 'Página Pública', icon: Palette },
  { id: 'monetization', label: 'Monetização', icon: Banknote },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
]

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const locale = useLocale()
  const qc = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data: detail, isLoading } = useQuery<CreatorDetail>({
    queryKey: ['creator', id],
    queryFn: () => fetch(`/api/creators/${id}`).then((r) => r.json()),
    initialData: () => qc.getQueryData<CreatorDetail>(['creator', id]),
  })

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/creators/${id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['creators'] })
      router.push(`/${locale}/creators`)
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-border" />
        <div className="h-32 animate-pulse rounded-2xl bg-border" />
        <div className="h-96 animate-pulse rounded-2xl bg-border" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
        <p>Criadora não encontrada.</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/creators`)}>
          Voltar para lista
        </Button>
      </div>
    )
  }

  const publicUrl = detail.customDomain
    ? `https://${detail.customDomain}`
    : `${typeof location !== 'undefined' ? location.origin : ''}/p/${detail.slug}`

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/creators`)}
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Criadoras
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Deletar criadora
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar {detail.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação é irreversível. Todos os links, cliques e planos VIP dessa criadora serão deletados permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? 'Deletando…' : 'Sim, deletar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Creator identity header */}
      <div className="bg-card mb-0 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-b-0 px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={detail.name} url={detail.avatarUrl} size={44} />
          <div>
            <h1 className="text-[17px] font-bold leading-tight">{detail.name}</h1>
            <div className="text-muted-foreground font-mono text-[12.5px]">/p/{detail.slug}</div>
          </div>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Ver página pública
        </a>
      </div>

      {/* Tab bar */}
      <div
        className="bg-card border-x border-b"
        role="tablist"
        aria-label="Seções da criadora"
      >
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div className="bg-card rounded-b-2xl border border-t-0">
        <div
          id="tabpanel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && <TabOverview detail={detail} />}
        </div>
        <div
          id="tabpanel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          hidden={activeTab !== 'design'}
        >
          {activeTab === 'design' && <TabPageDesign creatorId={detail.id} slug={detail.slug} creator={detail} />}
        </div>
        <div
          id="tabpanel-monetization"
          role="tabpanel"
          aria-labelledby="tab-monetization"
          hidden={activeTab !== 'monetization'}
        >
          {activeTab === 'monetization' && <TabMonetization detail={detail} />}
        </div>
        <div
          id="tabpanel-settings"
          role="tabpanel"
          aria-labelledby="tab-settings"
          hidden={activeTab !== 'settings'}
        >
          {activeTab === 'settings' && <TabSettings detail={detail} />}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@repo/ui/components/dialog'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { useToast } from '@repo/ui/hooks/use-toast'
import { Plus, Copy, ChevronRight, Users, MousePointerClick, ExternalLink } from 'lucide-react'
import {
  PLATFORMS,
  PLATFORM_KEYS,
  slugify,
  type CreatorListRow,
  type CreatorDetail,
} from '@/lib/creators'

const nf = (n: number) => n.toLocaleString('pt-BR')

export default function CreatorsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: creators, isLoading } = useQuery<CreatorListRow[]>({
    queryKey: ['creators'],
    queryFn: () => fetch('/api/creators').then((r) => r.json()),
  })

  // default selection = first creator
  const activeId = selectedId ?? creators?.[0]?.id ?? null

  const { data: detail } = useQuery<CreatorDetail>({
    queryKey: ['creator', activeId],
    queryFn: () => fetch(`/api/creators/${activeId}`).then((r) => r.json()),
    enabled: !!activeId,
  })

  const { mutate: createCreator, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error('Falha ao criar criadora')
      return res.json() as Promise<{ id: string; slug: string }>
    },
    onSuccess: ({ id }) => {
      setCreateOpen(false)
      setNewName('')
      setSelectedId(id)
      void qc.invalidateQueries({ queryKey: ['creators'] })
      toast({ title: 'Criadora criada' })
    },
    onError: (e) => toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      {/* title row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criadoras</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gerencie as páginas de links e acompanhe o rastreio de cliques de cada criadora.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova criadora
        </Button>
      </div>

      {/* stats */}
      <Stats creators={creators ?? []} />

      {/* creators table */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-sm font-semibold">Suas criadoras</span>
          <span className="text-xs text-muted-foreground">Clique numa criadora para ver o rastreio</span>
        </div>

        <div className="grid grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1.2fr_0.9fr_36px] gap-3.5 border-b px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Criadora</div><div>Página</div><div>Cliques 30d</div>
          <div>Tendência</div><div>Top link</div><div>Status</div><div />
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[70px] animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : !creators?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma criadora ainda. Crie a primeira página.</p>
          </div>
        ) : (
          creators.map((c) => (
            <CreatorRow key={c.id} c={c} selected={c.id === activeId} onSelect={() => setSelectedId(c.id)} />
          ))
        )}
      </div>

      {/* tracking detail */}
      {detail && <Tracking detail={detail} />}

      {/* create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova criadora</DialogTitle>
            <DialogDescription>Crie uma página de links e comece a rastrear os cliques.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Nome da criadora</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Babi Barelli"
                className="mt-2"
              />
            </div>
            <div className="rounded-lg border bg-background px-3 py-2.5 text-sm text-muted-foreground">
              URL da página:{' '}
              <span className="font-mono text-primary">/p/{newName ? slugify(newName) : 'nome-da-criadora'}</span>
            </div>
            <div>
              <p className="text-sm font-medium">Plataformas a rastrear</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {PLATFORM_KEYS.map((p) => (
                  <span key={p} className="inline-flex items-center gap-2 rounded-full border bg-secondary px-2.5 py-1.5 text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full" style={{ background: PLATFORMS[p].color }} />
                    {PLATFORMS[p].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createCreator()} disabled={isPending || newName.trim().length < 2}>
              {isPending ? 'Criando…' : 'Criar página'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function Stats({ creators }: { creators: CreatorListRow[] }) {
  const totalClicks = creators.reduce((s, c) => s + c.clicks30d, 0)
  const live = creators.filter((c) => c.status === 'live').length
  const byPlatform = new Map<string, { label: string; n: number }>()
  for (const c of creators) {
    if (!c.topLink) continue
    const cur = byPlatform.get(c.topLink.platform) ?? { label: c.topLink.label, n: 0 }
    cur.n += c.clicks30d
    byPlatform.set(c.topLink.platform, cur)
  }
  const top = [...byPlatform.values()].sort((a, b) => b.n - a.n)[0]
  const topPct = top && totalClicks ? Math.round((top.n / totalClicks) * 100) : 0

  const cards = [
    { label: 'Criadoras ativas', value: String(creators.length), sub: `${live} ativas · ${creators.length - live} rascunho` },
    { label: 'Cliques · 30 dias', value: nf(totalClicks), sub: 'soma de todas as páginas' },
    { label: 'Top plataforma', value: top?.label ?? '—', sub: top ? `${topPct}% de todos os cliques` : 'sem dados' },
    { label: 'Páginas publicadas', value: String(live), sub: 'visíveis em /p/{slug}' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border bg-card p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">{c.label}</span>
            <MousePointerClick className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="mt-2.5 text-2xl font-bold">{c.value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Creator row ────────────────────────────────────────────────────────────
function CreatorRow({ c, selected, onSelect }: { c: CreatorListRow; selected: boolean; onSelect: () => void }) {
  const { toast } = useToast()
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${location.origin}/p/${c.slug}`)
    toast({ title: 'Link copiado' })
  }
  return (
    <button
      onClick={onSelect}
      className={`grid w-full grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1.2fr_0.9fr_36px] items-center gap-3.5 border-b px-5 py-3.5 text-left transition-colors hover:bg-primary/5 ${selected ? 'bg-primary/[0.08]' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={c.name} url={c.avatarUrl} size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{c.name}</div>
          <div className="truncate text-[12.5px] text-muted-foreground">{c.handle}</div>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className="truncate font-mono">/p/{c.slug}</span>
        <Copy onClick={copy} className="h-3.5 w-3.5 shrink-0 cursor-pointer text-primary hover:text-primary/70" />
      </div>
      <div>
        <div className="text-[15px] font-bold">{nf(c.clicks30d)}</div>
        <div className="text-xs font-semibold" style={{ color: c.change >= 0 ? '#34d399' : '#f87171' }}>
          {c.change >= 0 ? '+' : ''}{String(c.change).replace('.', ',')}%
        </div>
      </div>
      <div className="flex h-[34px] items-end gap-[3px]">
        {c.trend.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-primary/55" style={{ height: `${Math.max(h, 6)}%` }} />
        ))}
      </div>
      <div>
        {c.topLink ? (
          <span className="inline-flex items-center gap-2 rounded-full border bg-secondary px-2.5 py-1.5 text-[12.5px] font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ background: c.topLink.color }} />
            {c.topLink.label}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <div>
        {c.status === 'live' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'rgba(52,211,153,.12)', color: '#34d399' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />Ativo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Rascunho</span>
        )}
      </div>
      <div className="flex justify-end text-muted-foreground/50">
        <ChevronRight className="h-[18px] w-[18px]" />
      </div>
    </button>
  )
}

// ─── Tracking detail ──────────────────────────────────────────────────────────
function Tracking({ detail }: { detail: CreatorDetail }) {
  const maxD = Math.max(1, ...detail.daily)
  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={detail.name} url={detail.avatarUrl} size={44} />
          <div>
            <div className="text-base font-bold">Rastreio de links · {detail.name}</div>
            <div className="font-mono text-[13px] text-muted-foreground">/p/{detail.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href={`/p/${detail.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver página
            </Button>
          </Link>
          <Button size="sm">Relatório completo</Button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr]">
        {/* chart */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-muted-foreground">Cliques · últimos 14 dias</span>
            <span className="text-[22px] font-bold">
              {nf(detail.totalClicks30d)} <span className="text-[13px] font-medium text-muted-foreground">total</span>
            </span>
          </div>
          <div className="flex h-[170px] items-end gap-1.5 border-b pb-0.5">
            {detail.daily.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t origin-bottom"
                style={{ height: `${Math.max(Math.round((v / maxD) * 100), 4)}%`, background: 'linear-gradient(180deg,#60a5fa,#3b82f6)' }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>14 dias atrás</span><span>7 dias</span><span>hoje</span>
          </div>
        </div>

        {/* per-platform */}
        <div>
          <span className="text-[13px] font-semibold text-muted-foreground">Cliques por plataforma</span>
          <div className="mt-4 flex flex-col gap-3.5">
            {detail.links.map((l) => (
              <div key={l.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                    <span className="h-2.5 w-2.5 rounded" style={{ background: l.color }} />{l.label}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    <strong className="text-foreground">{nf(l.clicks)}</strong> · {l.pct}%
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${l.barPct}%`, background: l.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Avatar (photo or gradient initials) ───────────────────────────────────────
function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border object-cover" style={{ width: size, height: size }} />
  }
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size >= 44 ? 15 : 14, background: 'linear-gradient(135deg,#6d5dfc,#22d3ee)' }}
    >
      {initials}
    </div>
  )
}

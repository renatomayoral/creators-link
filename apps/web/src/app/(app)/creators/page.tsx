'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Copy, ChevronRight, Users, MousePointerClick, ExternalLink, Settings2, Camera, X, Globe, Check, Loader2, Wallet, Trash2 } from 'lucide-react'
import {
  slugify,
  type CreatorListRow,
  type CreatorDetail,
} from '@/lib/creators'

type Platform = { id: string; key: string; label: string; color: string; active: boolean }

const nf = (n: number) => n.toLocaleString('pt-BR')

export default function CreatorsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: () => fetch('/api/platforms').then((r) => r.json()),
  })

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Falha no upload')
      const { url } = await res.json() as { url: string }
      setAvatarUrl(url)
    } catch (err) {
      toast({ title: 'Erro no upload', description: (err as Error).message, variant: 'destructive' })
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  function resetDialog() {
    setNewName('')
    setAvatarUrl(null)
    setAvatarPreview(null)
    setUploadingAvatar(false)
  }

  const { mutate: createCreator, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName, avatarUrl: avatarUrl ?? undefined }),
      })
      if (!res.ok) throw new Error('Falha ao criar criadora')
      return res.json() as Promise<{ id: string; slug: string }>
    },
    onSuccess: ({ id }) => {
      setCreateOpen(false)
      resetDialog()
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
          <h1 className="text-2xl font-extrabold tracking-tight">Criadoras</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gerencie as páginas de links e acompanhe o rastreio de cliques de cada criadora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/creators/platforms">
            <Button variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Plataformas
            </Button>
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova criadora
          </Button>
        </div>
      </div>

      {/* stats */}
      <Stats creators={creators ?? []} />

      {/* creators table */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-[15px] font-bold">Suas criadoras</span>
          <span className="text-xs text-muted-foreground">Clique numa criadora para ver o rastreio</span>
        </div>

        <div className="grid grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1.2fr_0.9fr_36px] gap-3.5 border-b px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Criadora</div><div>Página</div><div>Cliques 30d</div>
          <div>Tendência</div><div>Top link</div><div>Status</div><div />
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-17.5 animate-pulse bg-muted/40" />
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
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova criadora</DialogTitle>
            <DialogDescription>Crie uma página de links e comece a rastrear os cliques.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <label className="group relative cursor-pointer">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-border bg-secondary transition-colors group-hover:border-primary">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <Camera className="h-6 w-6" />
                      <span className="text-[10px] font-medium">Foto</span>
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
              </label>
              {avatarPreview && (
                <button onClick={() => { setAvatarPreview(null); setAvatarUrl(null) }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />Remover foto
                </button>
              )}
            </div>

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
            {platforms.filter((p) => p.active).length > 0 && (
              <div>
                <p className="text-sm font-medium">Plataformas a rastrear</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {platforms.filter((p) => p.active).map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-2 rounded-full border bg-secondary px-2.5 py-1.5 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetDialog() }}>Cancelar</Button>
            <Button onClick={() => createCreator()} disabled={isPending || uploadingAvatar || newName.trim().length < 2}>
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
          <div className="mt-2.5 text-[28px] font-extrabold leading-tight">{c.value}</div>
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
      className={`grid w-full grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1.2fr_0.9fr_36px] items-center gap-3.5 border-b px-5 py-3.5 text-left transition-colors hover:bg-primary/5 ${selected ? 'bg-primary/8' : ''}`}
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
      <div className="flex h-8.5 items-end gap-0.75">
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
        <ChevronRight className="h-4.5 w-4.5" />
      </div>
    </button>
  )
}

// ─── Tracking detail ──────────────────────────────────────────────────────────
function Tracking({ detail }: { detail: CreatorDetail }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const maxD = Math.max(1, ...detail.daily)

  const [domainInput, setDomainInput] = useState(detail.customDomain ?? '')
  const [domainSaving, setDomainSaving] = useState(false)

  const publicUrl = detail.customDomain
    ? `https://${detail.customDomain}`
    : `${typeof location !== 'undefined' ? location.origin : ''}/p/${detail.slug}`

  async function saveDomain() {
    setDomainSaving(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/domain`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customDomain: domainInput.trim() || null }),
      })
      const body = await res.json() as { error?: string; ok?: boolean }
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Erro ao salvar domínio')
      toast({ title: domainInput.trim() ? 'Domínio salvo' : 'Domínio removido' })
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setDomainSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={detail.name} url={detail.avatarUrl} size={44} />
          <div>
            <div className="text-[16px] font-bold">Rastreio de links · {detail.name}</div>
            <div className="font-mono text-[13px] text-muted-foreground">/p/{detail.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver página
            </Button>
          </a>
          <Button size="sm">Relatório completo</Button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr]">
        {/* chart */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-muted-foreground">Cliques · últimos 14 dias</span>
            <span className="text-[22px] font-extrabold">
              {nf(detail.totalClicks30d)} <span className="text-[13px] font-medium text-muted-foreground">total</span>
            </span>
          </div>
          <div className="flex h-42.5 items-end gap-1.5 border-b pb-0.5">
            {detail.daily.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg origin-bottom"
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
                <div className="h-1.75 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${l.barPct}%`, background: l.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom domain ───────────────────────────────────────────────────── */}
      <div className="border-t px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold">Domínio customizado</span>
          {detail.customDomain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <Check className="h-3 w-3" />Ativo
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="ex: amanda-zarayeva.com"
            className="font-mono text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveDomain}
            disabled={domainSaving || domainInput === (detail.customDomain ?? '')}
          >
            {domainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>

        <DomainInstructions domain={domainInput} />
      </div>

      {/* ── Monetization (VIP plans via Stripe / NowPayments) ─────────────────── */}
      <Monetization detail={detail} />
    </div>
  )
}

// ─── Monetization: connect payouts + manage VIP plans ────────────────────────
type VipPlan = {
  id: string
  title: string
  description: string | null
  amount: number
  currency: string
  intervalDay: number
  active: boolean
}

const intervalLabel = (d: number) =>
  d <= 31 ? 'mês' : d <= 92 ? 'trimestre' : d <= 366 ? 'ano' : `${d}d`

function Monetization({ detail }: { detail: CreatorDetail }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)

  // When the creator returns from Stripe onboarding, sync the account status.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('connect') !== 'return') return
    void (async () => {
      await fetch(`/api/creators/${detail.id}/connect`) // GET syncs stripeOnboarded
      void qc.invalidateQueries({ queryKey: ['creator', detail.id] })
      // strip the query param so a refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname)
    })()
  }, [detail.id, qc])

  const { data: plans = [] } = useQuery<VipPlan[]>({
    queryKey: ['vip-plans', detail.id],
    queryFn: () => fetch(`/api/creators/${detail.id}/plans`).then((r) => r.json()),
    enabled: detail.stripeOnboarded,
  })

  async function connect() {
    setConnecting(true)
    try {
      const res = await fetch(`/api/creators/${detail.id}/connect`, { method: 'POST' })
      const body = await res.json() as { url?: string; error?: string }
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Erro ao conectar')
      window.location.href = body.url
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
      setConnecting(false)
    }
  }

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-semibold">Monetização · planos VIP</span>
        {detail.stripeOnboarded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <Check className="h-3 w-3" />Pagamentos ativos
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
            Não conectado
          </span>
        )}
      </div>

      {!detail.stripeOnboarded ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
          <p className="text-[13px] text-muted-foreground">
            Conecte uma conta de recebimento para vender assinaturas VIP. O dinheiro cai direto
            na conta da criadora; a plataforma retém apenas a taxa do plano.
          </p>
          <Button size="sm" onClick={connect} disabled={connecting} className="self-start">
            {connecting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wallet className="mr-1.5 h-4 w-4" />}
            Conectar pagamentos
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <VipPlanList plans={plans} creatorId={detail.id} />
          <NewVipPlan creatorId={detail.id} onCreated={() => qc.invalidateQueries({ queryKey: ['vip-plans', detail.id] })} />
        </div>
      )}
    </div>
  )
}

function VipPlanList({ plans, creatorId }: { plans: VipPlan[]; creatorId: string }) {
  const qc = useQueryClient()
  const { toast } = useToast()

  async function remove(planId: string) {
    const res = await fetch(`/api/creators/${creatorId}/plans/${planId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Erro ao remover plano', variant: 'destructive' })
      return
    }
    void qc.invalidateQueries({ queryKey: ['vip-plans', creatorId] })
  }

  if (plans.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Nenhum plano VIP ainda. Crie o primeiro abaixo.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {plans.filter((p) => p.active).map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border px-4 py-2.5">
          <div>
            <div className="text-[14px] font-semibold">{p.title}</div>
            {p.description && <div className="text-[12px] text-muted-foreground">{p.description}</div>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold">
              {(p.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: p.currency.toUpperCase() })}
              <span className="text-[12px] font-medium text-muted-foreground">/{intervalLabel(p.intervalDay)}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function NewVipPlan({ creatorId, onCreated }: { creatorId: string; onCreated: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [interval, setInterval] = useState('30')
  const [saving, setSaving] = useState(false)

  async function save() {
    const amount = Math.round(parseFloat(price.replace(',', '.')) * 100)
    if (!title.trim() || !Number.isFinite(amount) || amount < 100) {
      toast({ title: 'Preencha título e preço (mín. 1,00)', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/creators/${creatorId}/plans`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), amount, intervalDay: Number(interval) }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: unknown }
        throw new Error(typeof b.error === 'string' ? b.error : 'Erro ao criar plano')
      }
      setTitle(''); setPrice(''); setInterval('30'); setOpen(false)
      onCreated()
      toast({ title: 'Plano VIP criado' })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />Novo plano VIP
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: VIP Mensal)" className="text-sm" />
      <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço (ex: 29.90)" inputMode="decimal" className="text-sm sm:w-32" />
      <select
        value={interval}
        onChange={(e) => setInterval(e.target.value)}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        <option value="30">Mensal</option>
        <option value="90">Trimestral</option>
        <option value="365">Anual</option>
      </select>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  )
}

// ─── Domain instructions with provider shortcuts ─────────────────────────────
const DNS_PROVIDERS: { name: string; color: string; url: (d: string) => string }[] = [
  { name: 'Cloudflare',  color: '#f6821f', url: (d) => `https://dash.cloudflare.com/?to=/:account/${d}/dns/records` },
  { name: 'GoDaddy',     color: '#1bdbdb', url: (d) => `https://dcc.godaddy.com/manage/${d}/dns` },
  { name: 'Namecheap',   color: '#de3723', url: (d) => `https://ap.www.namecheap.com/Domains/DomainControlPanel/${d}/advancedns` },
  { name: 'Registro.br', color: '#009c3b', url: () => 'https://registro.br/tecnologia/ferramentas/dns/' },
  { name: 'HostGator',   color: '#ff6600', url: () => 'https://www.hostgator.com.br/suporte' },
  { name: 'Locaweb',     color: '#0070c0', url: () => 'https://www.locaweb.com.br/painel/' },
  { name: 'KingHost',    color: '#7b2d8b', url: () => 'https://painel.kinghost.com.br/' },
  { name: 'Wix',         color: '#faad00', url: () => 'https://manage.wix.com/premium-purchase-plan/dynamo' },
]

function DomainInstructions({ domain }: { domain: string }) {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'creatorslink.org'
  const [detected, setDetected] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)

  // Debounced NS lookup — fires 600ms after user stops typing
  useEffect(() => {
    const clean = domain.trim().toLowerCase().replace(/^www\./, '')
    if (!clean || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(clean)) {
      setDetected(null)
      return
    }
    setDetecting(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/domain-detect?domain=${encodeURIComponent(clean)}`)
        const { provider } = await res.json() as { provider: string | null }
        setDetected(provider)
      } catch {
        setDetected(null)
      } finally {
        setDetecting(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [domain])

  const cname = `${domain || 'seu-dominio.com'}  →  CNAME  →  ${appDomain}`
  const knownProviders = DNS_PROVIDERS.filter((p) => p.name === detected)
  const otherProviders = DNS_PROVIDERS.filter((p) => p.name !== detected)
  const sorted = [...knownProviders, ...otherProviders]

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="font-semibold text-foreground">
          Como configurar
          {detecting && <span className="ml-2 text-[11px] font-normal opacity-60">detectando provedor…</span>}
          {!detecting && detected && <span className="ml-2 text-[11px] font-normal text-emerald-400">· {detected} detectado</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((p) => {
            const isDetected = detected === p.name
            return (
              <a
                key={p.name}
                href={p.url(domain || 'seu-dominio.com')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all hover:bg-background"
                style={{
                  borderColor: isDetected ? p.color : undefined,
                  color: isDetected ? p.color : undefined,
                  background: isDetected ? `${p.color}18` : undefined,
                  order: isDetected ? -1 : 0,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
              </a>
            )
          })}
        </div>
      </div>
      <ol className="mt-2.5 list-decimal pl-4 space-y-1">
        <li>
          {detected
            ? <>Abra o <strong>{detected}</strong> (botão destacado acima) e crie um registro <strong>CNAME</strong>:</>
            : <>No painel do seu provedor (botões acima), crie um registro <strong>CNAME</strong>:</>
          }
        </li>
      </ol>
      <pre className="mt-2 rounded bg-background px-3 py-2 font-mono text-[11px] overflow-x-auto">{cname}</pre>
      <ol className="mt-2 list-decimal pl-4 space-y-1" start={2}>
        <li>Aguarde a propagação do DNS (pode levar até 24h).</li>
        <li>Salve o domínio acima — a página da criadora passará a responder no domínio dela.</li>
      </ol>
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

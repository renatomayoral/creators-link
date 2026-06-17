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
import { Camera, Plus, Settings2, Users, X } from 'lucide-react'
import { slugify, type CreatorListRow, type CreatorDetail } from '@/lib/creators'
import { CreatorsStats } from './_components/creators-stats'
import { CreatorRow } from './_components/creator-row'
import { Tracking } from './_components/tracking'

type Platform = { id: string; key: string; label: string; color: string; active: boolean }

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
      const { url } = (await res.json()) as { url: string }
      setAvatarUrl(url)
    } catch (err) {
      toast({
        title: 'Erro no upload',
        description: (err as Error).message,
        variant: 'destructive',
      })
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
    onError: (e) =>
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Criadoras</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
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

      <CreatorsStats creators={creators ?? []} />

      {/* Creators table */}
      <div className="bg-card rounded-2xl border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-[15px] font-bold">Suas criadoras</span>
          <span className="text-muted-foreground text-xs">
            Clique numa criadora para ver o rastreio
          </span>
        </div>

        <div className="text-muted-foreground grid grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1.2fr_0.9fr_36px] gap-3.5 border-b px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
          <div>Criadora</div>
          <div>Página</div>
          <div>Cliques 30d</div>
          <div>Tendência</div>
          <div>Top link</div>
          <div>Status</div>
          <div />
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-muted/40 h-17.5 animate-pulse" />
            ))}
          </div>
        ) : !creators?.length ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma criadora ainda. Crie a primeira página.</p>
          </div>
        ) : (
          creators.map((c) => (
            <CreatorRow
              key={c.id}
              c={c}
              selected={c.id === activeId}
              onSelect={() => setSelectedId(c.id)}
            />
          ))
        )}
      </div>

      {detail && <Tracking detail={detail} />}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o)
          if (!o) resetDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova criadora</DialogTitle>
            <DialogDescription>
              Crie uma página de links e comece a rastrear os cliques.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <label className="group relative cursor-pointer">
                <div className="border-border bg-secondary group-hover:border-primary h-20 w-20 overflow-hidden rounded-full border-2 border-dashed transition-colors">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
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
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarPreview && (
                <button
                  onClick={() => {
                    setAvatarPreview(null)
                    setAvatarUrl(null)
                  }}
                  className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  Remover foto
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
            <div className="bg-background text-muted-foreground rounded-lg border px-3 py-2.5 text-sm">
              URL da página:{' '}
              <span className="text-primary font-mono">
                /p/{newName ? slugify(newName) : 'nome-da-criadora'}
              </span>
            </div>

            {platforms.filter((p) => p.active).length > 0 && (
              <div>
                <p className="text-sm font-medium">Plataformas a rastrear</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {platforms
                    .filter((p) => p.active)
                    .map((p) => (
                      <span
                        key={p.id}
                        className="bg-secondary inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        {p.label}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                resetDialog()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createCreator()}
              disabled={isPending || uploadingAvatar || newName.trim().length < 2}
            >
              {isPending ? 'Criando…' : 'Criar página'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

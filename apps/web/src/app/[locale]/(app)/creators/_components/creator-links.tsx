'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@repo/ui/components/input'
import type { CreatorLinkStat } from '@/lib/creators'
import { PlatformLogo } from '@/components/platform-logos'

type Platform = { id: string; key: string; label: string; color: string; baseUrl: string; active: boolean }

type Props = {
  creatorId: string
  links: CreatorLinkStat[]
}

export function CreatorLinks({ creatorId, links }: Props) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newPlatform, setNewPlatform] = useState('')
  const [newUrl, setNewUrl] = useState('')
  // Optimistic local order — mirrors `links` until a drag reorders it, then
  // takes over until the invalidated query brings back the persisted order.
  const [order, setOrder] = useState<string[] | null>(null)

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: () => fetch('/api/platforms').then((r) => r.json()),
    staleTime: 60_000,
  })

  const invalidate = () => {
    setOrder(null)
    qc.invalidateQueries({ queryKey: ['creator', creatorId] })
  }

  const reorderLinks = useMutation({
    mutationFn: (linkIds: string[]) =>
      fetch(`/api/creators/${creatorId}/links/reorder`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order: linkIds }),
      }),
    onSuccess: invalidate,
    onError: () => setOrder(null),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const orderedLinks = order
    ? (order.map((id) => links.find((l) => l.id === id)).filter(Boolean) as CreatorLinkStat[])
    : links

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = orderedLinks.map((l) => l.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(ids, oldIndex, newIndex)
    setOrder(next)
    reorderLinks.mutate(next)
  }

  const addLink = useMutation({
    mutationFn: () =>
      fetch(`/api/creators/${creatorId}/links`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: newPlatform, url: newUrl }),
      }).then((r) => r.json()),
    onSuccess: () => {
      setAdding(false)
      setNewPlatform('')
      setNewUrl('')
      invalidate()
    },
  })

  const removeLink = useMutation({
    mutationFn: (linkId: string) =>
      fetch(`/api/creators/${creatorId}/links/${linkId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const patchLink = useMutation({
    mutationFn: ({ linkId, data }: { linkId: string; data: Record<string, unknown> }) =>
      fetch(`/api/creators/${creatorId}/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  })

  const existingPlatformKeys = new Set(links.map((l) => l.platform))
  const availableToAdd = platforms.filter((p) => p.active && !existingPlatformKeys.has(p.key))

  function handlePlatformSelect(key: string) {
    setNewPlatform(key)
    const p = platforms.find((pl) => pl.key === key)
    if (p) setNewUrl(p.baseUrl)
  }

  return (
    <div className="border-t px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Links de plataformas</span>
        {availableToAdd.length > 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-blue-500 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        )}
      </div>

      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {orderedLinks.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                onSaveUrl={(url) => patchLink.mutate({ linkId: link.id, data: { url } })}
                onToggleActive={() => patchLink.mutate({ linkId: link.id, data: { active: !(link as unknown as { active?: boolean }).active } })}
                onRemove={() => removeLink.mutate(link.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {links.length === 0 && !adding && (
          <p className="py-4 text-center text-[12.5px] text-muted-foreground">
            Nenhum link configurado ainda.
          </p>
        )}

        {/* Add new link form */}
        {adding && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 p-3">
            <label htmlFor="new-platform-select" className="sr-only">Selecionar plataforma</label>
            <select
              id="new-platform-select"
              value={newPlatform}
              onChange={(e) => handlePlatformSelect(e.target.value)}
              className="bg-background rounded-lg border px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecionar plataforma…</option>
              {availableToAdd.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>

            {newPlatform && (
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://…"
                className="text-[13px]"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAdding(false); setNewPlatform(''); setNewUrl('') }}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                onClick={() => addLink.mutate()}
                disabled={!newPlatform || !newUrl || addLink.isPending}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-blue-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {addLink.isPending ? 'Salvando…' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinkRow({
  link,
  onSaveUrl,
  onRemove,
}: {
  link: CreatorLinkStat
  onSaveUrl: (url: string) => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  const [url, setUrl] = useState(link.url)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar link ${link.label}`}
        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <PlatformLogo platform={link.platform} size={22}  />
      <span className="w-24 shrink-0 text-[12.5px] font-semibold">{link.label}</span>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => { if (url !== link.url) onSaveUrl(url) }}
        className="h-8 min-w-0 flex-1 font-mono text-[12px]"
        placeholder="https://…"
      />
      <span className="shrink-0 text-[11px] text-muted-foreground">{link.clicks} cliques</span>
      <button
        onClick={onRemove}
        aria-label={`Remover link ${link.label}`}
        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

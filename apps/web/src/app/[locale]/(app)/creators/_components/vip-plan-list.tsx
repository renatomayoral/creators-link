'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { useToast } from '@repo/ui/hooks/use-toast'
import { fmtPrice, intervalLabel, type VipPlan } from '../_lib/vip-plans'

type Props = { plans: VipPlan[]; creatorId: string }

export function VipPlanList({ plans, creatorId }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground text-[13px]">
        Nenhum plano VIP ainda. Crie o primeiro abaixo.
      </p>
    )
  }

  async function toggleActive(plan: VipPlan) {
    const res = await fetch(`/api/creators/${creatorId}/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !plan.active }),
    })
    if (!res.ok) {
      toast({ title: 'Erro ao atualizar plano', variant: 'destructive' })
      return
    }
    void qc.invalidateQueries({ queryKey: ['vip-plans', creatorId] })
  }

  function startEdit(plan: VipPlan) {
    setEditingId(plan.id)
    setEditTitle(plan.title)
    setEditDesc(plan.description ?? '')
  }

  async function saveEdit(planId: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/creators/${creatorId}/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null }),
      })
      if (!res.ok) throw new Error()
      void qc.invalidateQueries({ queryKey: ['vip-plans', creatorId] })
      setEditingId(null)
      toast({ title: 'Plano atualizado' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(planId: string) {
    const res = await fetch(`/api/creators/${creatorId}/plans/${planId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Erro ao remover plano', variant: 'destructive' })
      return
    }
    void qc.invalidateQueries({ queryKey: ['vip-plans', creatorId] })
    toast({ title: 'Plano removido' })
  }

  return (
    <div className="flex flex-col gap-2">
      {plans.map((p) => (
        <div
          key={p.id}
          className={`rounded-xl border px-4 py-3 transition-opacity ${!p.active ? 'opacity-50' : ''}`}
        >
          {editingId === p.id ? (
            <div className="flex flex-col gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título"
                className="text-sm"
              />
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição (opcional)"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(p.id)} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-semibold">{p.title}</span>
                  {!p.active && (
                    <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      inativo
                    </span>
                  )}
                </div>
                {p.description && (
                  <div className="text-muted-foreground mt-0.5 text-[12px]">{p.description}</div>
                )}
                <div className="text-muted-foreground mt-1 text-[11px]">
                  {intervalLabel(p.intervalDay)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[14px] font-bold">{fmtPrice(p.amount, p.currency)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={p.active ? 'Desativar' : 'Ativar'}
                  onClick={() => toggleActive(p)}
                >
                  {p.active ? (
                    <ToggleRight className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Editar"
                  onClick={() => startEdit(p)}
                >
                  <Pencil className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Remover"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

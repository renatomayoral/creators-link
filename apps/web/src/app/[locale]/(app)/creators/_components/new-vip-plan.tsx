'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
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
import { CURRENCY_OPTIONS, INTERVAL_OPTIONS, fmtPrice, intervalLabel } from '../_lib/vip-plans'

type Props = { creatorId: string; onCreated: () => void }

const DEFAULT_INTERVAL = '30'
const DEFAULT_CURRENCY = 'brl'

export function NewVipPlan({ creatorId, onCreated }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [intervalDay, setIntervalDay] = useState(DEFAULT_INTERVAL)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle('')
    setDescription('')
    setPrice('')
    setCurrency(DEFAULT_CURRENCY)
    setIntervalDay(DEFAULT_INTERVAL)
  }

  async function save() {
    const amount = Math.round(parseFloat(price.replace(',', '.')) * 100)
    if (!title.trim()) {
      toast({ title: 'Informe o título do plano', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(amount) || amount < 100) {
      toast({ title: 'Preço mínimo: 1,00', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/creators/${creatorId}/plans`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          amount,
          currency,
          intervalDay: Number(intervalDay),
        }),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: unknown }
        throw new Error(typeof b.error === 'string' ? b.error : 'Erro ao criar plano')
      }
      reset()
      setOpen(false)
      onCreated()
      toast({ title: 'Plano VIP criado' })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const previewAmount = parseFloat(price.replace(',', '.'))
  const selectedIntervalLabel = intervalLabel(Number(intervalDay))

  return (
    <>
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Novo plano VIP
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo plano VIP</DialogTitle>
            <DialogDescription>
              Configure o plano que os fãs verão na página da criadora.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: VIP Mensal, Acesso Total, Pack Semanal"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">
                Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Fotos exclusivas + acesso ao grupo VIP"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[13px] font-medium">Preço</label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 29,90"
                  inputMode="decimal"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium">Moeda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Periodicidade</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntervalDay(opt.value)}
                    className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors ${
                      intervalDay === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <span className="text-[13px] font-semibold">{opt.label}</span>
                    <span className="text-[10px]">{opt.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {title && price && (
              <div className="rounded-xl border border-dashed p-3">
                <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Preview
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-bold">{title}</div>
                    {description && (
                      <div className="text-muted-foreground text-[12px]">{description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-black">
                      {Number.isFinite(previewAmount)
                        ? fmtPrice(Math.round(previewAmount * 100), currency)
                        : price}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      /{selectedIntervalLabel}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Criar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

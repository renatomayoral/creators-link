'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { useToast } from '@repo/ui/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@repo/ui/components/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog'
import { Plus, Pencil, Trash2, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'

type Platform = {
  id: string
  key: string
  label: string
  color: string
  baseUrl: string
  sortOrder: number
  active: boolean
}

const empty = (): Omit<Platform, 'id'> => ({
  key: '',
  label: '',
  color: '#3b82f6',
  baseUrl: 'https://',
  sortOrder: 0,
  active: true,
})

export default function PlatformsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Platform | null>(null)
  const [form, setForm] = useState(empty())
  const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null)

  const { data: platforms = [], isLoading } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: () => fetch('/api/platforms').then((r) => r.json()),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty())
    setDialogOpen(true)
  }

  const openEdit = (p: Platform) => {
    setEditing(p)
    setForm({
      key: p.key,
      label: p.label,
      color: p.color,
      baseUrl: p.baseUrl,
      sortOrder: p.sortOrder,
      active: p.active,
    })
    setDialogOpen(true)
  }

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/platforms/${editing.id}` : '/api/platforms'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(typeof body.error === 'string' ? body.error : t('platforms.toastError'))
      }
      return res.json()
    },
    onSuccess: () => {
      setDialogOpen(false)
      void qc.invalidateQueries({ queryKey: ['platforms'] })
      toast({ title: editing ? t('platforms.toastUpdated') : t('platforms.toastSaved') })
    },
    onError: (e) =>
      toast({ title: t('platforms.toastError'), description: (e as Error).message, variant: 'destructive' }),
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: (p: Platform) =>
      fetch(`/api/platforms/${p.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platforms'] }),
    onError: () => toast({ title: t('platforms.toastStatusError'), variant: 'destructive' }),
  })

  const { mutate: deletePlatform } = useMutation({
    mutationFn: (id: string) => fetch(`/api/platforms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteTarget(null)
      void qc.invalidateQueries({ queryKey: ['platforms'] })
      toast({ title: t('platforms.toastRemoved') })
    },
    onError: () => toast({ title: t('platforms.toastRemoveError'), variant: 'destructive' }),
  })

  const isFormValid =
    form.key.length > 0 &&
    form.label.length > 0 &&
    /^#[0-9a-fA-F]{6}$/.test(form.color) &&
    form.baseUrl.startsWith('http')

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/creators`}
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('platforms.backToCreators')}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('platforms.title')}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {t('platforms.description')}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('platforms.newPlatform')}
        </Button>
      </div>

      {/* table */}
      <div className="bg-card rounded-2xl border">
        <div className="text-muted-foreground grid grid-cols-[2rem_1fr_1fr_1.5fr_5rem_5rem_5rem] items-center gap-3 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase">
          <div />
          <div>{t('platforms.colKey')}</div>
          <div>{t('platforms.colLabel')}</div>
          <div>{t('platforms.colBaseUrl')}</div>
          <div>{t('platforms.colOrder')}</div>
          <div>{t('platforms.colStatus')}</div>
          <div />
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted/40 h-14 animate-pulse" />
            ))}
          </div>
        ) : platforms.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm">{t('platforms.noPlatforms')}</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              {t('platforms.createFirst')}
            </Button>
          </div>
        ) : (
          platforms.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2rem_1fr_1fr_1.5fr_5rem_5rem_5rem] items-center gap-3 border-b px-5 py-3.5 last:border-0"
            >
              {/* color swatch */}
              <div className="h-5 w-5 rounded" style={{ background: p.color }} />

              {/* key */}
              <span className="font-mono text-sm">{p.key}</span>

              {/* label */}
              <span className="text-sm font-semibold">{p.label}</span>

              {/* baseUrl */}
              <span className="text-muted-foreground truncate text-xs">{p.baseUrl}</span>

              {/* sort order */}
              <span className="text-muted-foreground text-sm">{p.sortOrder}</span>

              {/* active toggle */}
              <button
                onClick={() => toggleActive(p)}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                {p.active ? (
                  <>
                    <ToggleRight className="text-primary h-4 w-4" />
                    <span className="text-primary">{t('platforms.statusActive')}</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground">{t('platforms.statusInactive')}</span>
                  </>
                )}
              </button>

              {/* actions */}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => openEdit(p)}
                  className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('platforms.dialogEditTitle') : t('platforms.dialogNewTitle')}</DialogTitle>
            <DialogDescription>
              {editing
                ? t('platforms.dialogEditDesc')
                : t('platforms.dialogNewDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field label={t('platforms.fieldKey')}>
              <Input
                value={form.key}
                onChange={(e) =>
                  setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s/g, '-') }))
                }
                placeholder="ex: onlyfans"
                disabled={!!editing}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t('platforms.fieldKeyHelp')}
              </p>
            </Field>

            <Field label={t('platforms.fieldLabel')}>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="ex: OnlyFans"
              />
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={t('platforms.fieldColor')}>
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="#ec4899"
                />
              </Field>
              <div className="flex flex-col justify-end pb-0.5">
                <div
                  className="h-9 w-9 rounded-md border"
                  style={{
                    background: /^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : 'transparent',
                  }}
                />
              </div>
            </div>

            <Field label={t('platforms.fieldBaseUrl')}>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://onlyfans.com/"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t('platforms.fieldBaseUrlHelp')}
              </p>
            </Field>

            <Field label={t('platforms.fieldOrder')}>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('platforms.cancel')}
            </Button>
            <Button onClick={() => save()} disabled={isSaving || !isFormValid}>
              {isSaving ? t('platforms.saving') : editing ? t('platforms.saveChanges') : t('platforms.createPlatform')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('platforms.alertDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('platforms.alertDeleteDesc', { label: deleteTarget?.label ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('platforms.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deletePlatform(deleteTarget.id)}
            >
              {t('platforms.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

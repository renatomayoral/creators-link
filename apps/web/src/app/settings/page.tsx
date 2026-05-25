'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import { Switch } from '@repo/ui/components/switch'
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
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
import { Separator } from '@repo/ui/components/separator'
import { useToast } from '@repo/ui/hooks/use-toast'
import { z } from 'zod'
import { AppSettingsSchema, type AppSettings } from '@repo/shared/types'
import { formatBytes, formatCurrency } from '@repo/shared/utils'
import { STORAGE_COST_PER_GB_MONTH_USD } from '@repo/shared/constants'
import { Save, TestTube, Trash2, PauseCircle } from 'lucide-react'
import type { StorageStats } from '@repo/shared/types'

export default function SettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // z.input<> = form fields (optional where schema has defaults)
  // AppSettings (z.output<>) = submitted/validated data (all required with defaults applied)
  const form = useForm<z.input<typeof AppSettingsSchema>, unknown, AppSettings>({
    resolver: zodResolver(AppSettingsSchema),
    defaultValues: {
      cloudProvider: 'gcp',
      gcpProjectId: 'mktia-ai-studio',
      gcpProjectNumber: '448251250847',
      gcpInstanceName: '',
      gcpZone: 'us-central1-a',
      gcsBucketName: 'mktia-ai-studio-outputs',
      autoUpload: true,
      hfToken: '',
      autoShutdownHours: 4,
      runpodDockerImage: 'ghcr.io/renatomayoral/nfsw-ai-studio:latest',
      runpodGpuType: 'NVIDIA A100-SXM4-80GB',
    },
  })

  const { data: storageStats } = useQuery<StorageStats>({
    queryKey: ['storage-stats'],
    queryFn: () => fetch('/api/library/stats').then((r) => r.json()),
  })

  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: (data: AppSettings) =>
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => toast({ title: 'Configurações salvas!' }),
    onError: () =>
      toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  })

  const { mutate: testConnection, isPending: isTesting } = useMutation({
    mutationFn: () => fetch('/api/health').then((r) => r.json()),
    onSuccess: (data: { comfyui: boolean }) => {
      toast({
        title: data.comfyui ? '✅ Conexão OK' : '⚠️ ComfyUI offline',
        description: data.comfyui
          ? 'ComfyUI respondendo normalmente'
          : 'Verifique o túnel SSH',
      })
    },
    onError: () =>
      toast({ title: 'Erro de conexão', variant: 'destructive' }),
  })

  const { mutate: stopPod } = useMutation({
    mutationFn: () => fetch('/api/vm/stop', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vm-status'] })
      toast({ title: 'Pod pausado' })
    },
  })

  const { mutate: deletePod } = useMutation({
    mutationFn: () => fetch('/api/vm', { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vm-status'] })
      toast({ title: 'Pod deletado' })
    },
  })

  const provider = form.watch('cloudProvider')
  const storageGB = (storageStats?.totalSizeBytes ?? 0) / 1024 ** 3

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <form onSubmit={form.handleSubmit((d) => saveSettings(d))} className="space-y-6">
        {/* Cloud Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cloud Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={provider}
              onValueChange={(v) =>
                form.setValue('cloudProvider', v as 'gcp' | 'runpod')
              }
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer has-[:checked]:border-primary">
                <RadioGroupItem value="gcp" id="gcp" />
                <div>
                  <p className="font-medium">☁️ Google Cloud</p>
                  <p className="text-xs text-muted-foreground">VM dedicada</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer has-[:checked]:border-primary">
                <RadioGroupItem value="runpod" id="runpod" />
                <div>
                  <p className="font-medium">⚡ RunPod</p>
                  <p className="text-xs text-muted-foreground">Pod sob demanda</p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* GCP Settings */}
        {provider === 'gcp' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Cloud Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup label="Project ID">
                <Input {...form.register('gcpProjectId')} />
              </FieldGroup>
              <FieldGroup label="Project Number">
                <Input {...form.register('gcpProjectNumber')} />
              </FieldGroup>
              <FieldGroup label="Instance Name">
                <Input
                  {...form.register('gcpInstanceName')}
                  placeholder="ai-studio-vm"
                />
              </FieldGroup>
              <FieldGroup label="Zone">
                <Input
                  {...form.register('gcpZone')}
                  placeholder="us-central1-a"
                />
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        {/* RunPod Settings */}
        {provider === 'runpod' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RunPod</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup label="API Key">
                <Input
                  {...form.register('runpodApiKey')}
                  type="password"
                  placeholder="rp_..."
                />
              </FieldGroup>
              <FieldGroup label="GPU Type">
                <Input
                  {...form.register('runpodGpuType')}
                  placeholder="NVIDIA A100-SXM4-80GB"
                />
              </FieldGroup>
              <FieldGroup label="Pod ID (existente)">
                <Input
                  {...form.register('runpodPodId')}
                  placeholder="Deixe vazio para criar novo"
                />
              </FieldGroup>
              <FieldGroup label="Docker Image">
                <Input {...form.register('runpodDockerImage')} />
              </FieldGroup>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full">
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Parar Pod (mantém volume ~$0.07/GB/mês)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Parar Pod?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O pod será pausado mas o volume será mantido. Você continuará pagando ~$0.07/GB/mês pelo storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => stopPod()}>Parar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Pod (destrói volume e dados)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Deletar Pod definitivamente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. O pod e seu volume serão completamente destruídos.
                      Os modelos (~100GB) precisarão ser baixados novamente, o que leva 30-40 minutos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePod()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Deletar definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storage (GCS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Bucket Name">
              <Input {...form.register('gcsBucketName')} />
            </FieldGroup>

            {storageStats && (
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total arquivos</span>
                  <span>{storageStats.totalFiles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamanho total</span>
                  <span>{formatBytes(storageStats.totalSizeBytes)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Custo/mês</span>
                  <span>{formatCurrency(storageGB * STORAGE_COST_PER_GB_MONTH_USD)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-upload">Auto-upload de outputs</Label>
              <Switch
                id="auto-upload"
                checked={form.watch('autoUpload')}
                onCheckedChange={(v) => form.setValue('autoUpload', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* HF Token + Auto Shutdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="HuggingFace Token">
              <Input
                {...form.register('hfToken')}
                type="password"
                placeholder="hf_..."
              />
            </FieldGroup>

            <div className="space-y-2">
              <Label>Auto-shutdown</Label>
              <Select
                value={String(form.watch('autoShutdownHours') ?? 'null')}
                onValueChange={(v) =>
                  form.setValue(
                    'autoShutdownHours',
                    v === 'null' ? null : Number(v),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Após 1 hora</SelectItem>
                  <SelectItem value="2">Após 2 horas</SelectItem>
                  <SelectItem value="4">Após 4 horas</SelectItem>
                  <SelectItem value="null">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSaving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => testConnection()}
            disabled={isTesting}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Testando...' : 'Testar conexão'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function FieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

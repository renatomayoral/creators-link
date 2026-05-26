'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Progress } from '@repo/ui/components/progress'
import { Separator } from '@repo/ui/components/separator'
import { formatBytes, formatCurrency } from '@repo/shared/utils'
import { STORAGE_COST_PER_GB_MONTH_USD } from '@repo/shared/constants'
import {
  Play,
  Square,
  RefreshCw,
  HardDrive,
  Cpu,
  DollarSign,
  Image,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { InstanceStatus } from '@repo/shared/types'

type VMStatus = {
  status: InstanceStatus
  metrics?: {
    vramUsedGB: number
    vramTotalGB: number
    gpuUtilizationPct: number
    temperatureC: number
  }
}

type StorageStats = {
  totalFiles: number
  totalSizeBytes: number
  imageCount: number
  videoCount: number
}

type Credits = {
  creditRemainingUSD: number
  usedThisMonthUSD: number
  estimatedCostPerHour: number
}

type RecentAsset = {
  id: string
  filename: string
  downloadUrl?: string
  type: 'image' | 'video'
  createdAt: string
}

const statusVariant: Record<
  InstanceStatus,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  RUNNING: 'success',
  STARTING: 'warning',
  STOPPING: 'warning',
  STOPPED: 'secondary',
  UNKNOWN: 'destructive',
}

export default function DashboardPage() {
  const { data: vm, refetch: refetchVm } = useQuery<VMStatus>({
    queryKey: ['vm-status'],
    queryFn: () => fetch('/api/vm/status').then((r) => r.json()),
    refetchInterval: 5000,
  })

  const { data: storage } = useQuery<StorageStats>({
    queryKey: ['storage-stats'],
    queryFn: () => fetch('/api/library/stats').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  const { data: credits } = useQuery<Credits>({
    queryKey: ['credits'],
    queryFn: () => fetch('/api/credits').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const { data: recentAssets } = useQuery<RecentAsset[]>({
    queryKey: ['recent-assets'],
    queryFn: () => fetch('/api/library?limit=8').then((r) => r.json()),
    refetchInterval: 15_000,
  })

  const handleVmAction = async (action: 'start' | 'stop' | 'restart') => {
    const method = action === 'stop' ? 'POST' : 'POST'
    const url = action === 'stop' ? '/api/vm/stop' : '/api/vm/start'
    await fetch(url, { method })
    void refetchVm()
  }

  const vmStatus = vm?.status ?? 'UNKNOWN'
  const gpuPct = vm?.metrics?.gpuUtilizationPct ?? 0
  const vramUsed = vm?.metrics?.vramUsedGB ?? 0
  const vramTotal = vm?.metrics?.vramTotalGB ?? 80
  const storageGB = (storage?.totalSizeBytes ?? 0) / 1024 ** 3
  const storageCost = storageGB * STORAGE_COST_PER_GB_MONTH_USD

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* VM Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Instância GPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={statusVariant[vmStatus]}>{vmStatus}</Badge>
              {credits && (
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(credits.estimatedCostPerHour)}/h
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>GPU</span>
                <span>{gpuPct}%</span>
              </div>
              <Progress value={gpuPct} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>VRAM</span>
                <span>
                  {vramUsed.toFixed(1)} / {vramTotal.toFixed(0)} GB
                </span>
              </div>
              <Progress
                value={(vramUsed / vramTotal) * 100}
                className="h-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleVmAction('start')}
                disabled={vmStatus === 'RUNNING' || vmStatus === 'STARTING'}
              >
                <Play className="h-3 w-3 mr-1" />
                Iniciar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleVmAction('stop')}
                disabled={vmStatus === 'STOPPED' || vmStatus === 'STOPPING'}
              >
                <Square className="h-3 w-3 mr-1" />
                Parar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleVmAction('restart')}
                disabled={vmStatus !== 'RUNNING'}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage GCS</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">
              {formatBytes(storage?.totalSizeBytes ?? 0)}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Imagens</span>
                <span>{storage?.imageCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Vídeos</span>
                <span>{storage?.videoCount ?? 0}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium text-foreground">
                <span>Custo/mês</span>
                <span>{formatCurrency(storageCost)}</span>
              </div>
            </div>
            <Link href="/library">
              <Button size="sm" variant="ghost" className="w-full mt-2">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Biblioteca
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Credits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Créditos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">
              {formatCurrency(credits?.creditRemainingUSD ?? 0)}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Restante</span>
                <span>{formatCurrency(credits?.creditRemainingUSD ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gasto este mês</span>
                <span>{formatCurrency(credits?.usedThisMonthUSD ?? 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Últimas Gerações</h2>
          <Link href="/library">
            <Button size="sm" variant="ghost">
              Ver todas
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        {recentAssets && recentAssets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
              >
                {asset.type === 'image' && asset.downloadUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.downloadUrl}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                ) : asset.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-4xl">🎬</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{asset.filename}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mb-3 opacity-30" />
              <p>Nenhuma geração ainda</p>
              <Link href="/generate" className="mt-3">
                <Button size="sm">Gerar agora</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

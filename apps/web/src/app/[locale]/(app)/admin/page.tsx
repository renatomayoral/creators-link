'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@repo/ui/components/button'
import { Users, MousePointerClick, Link2, TrendingUp } from 'lucide-react'

type Creator = { id: string; name: string; clicks30d: number; status: string }

export default function AdminPage() {
  const router = useRouter()

  const { data: creators = [] } = useQuery<Creator[]>({
    queryKey: ['creators'],
    queryFn: () => fetch('/api/creators').then((r) => r.json()),
  })

  const totalClicks = creators.reduce((s, c) => s + c.clicks30d, 0)
  const live = creators.filter((c) => c.status === 'live').length

  const stats = [
    { label: 'Criadoras', value: creators.length, icon: Users },
    { label: 'Ativas', value: live, icon: Link2 },
    { label: 'Cliques 30d', value: totalClicks.toLocaleString('pt-BR'), icon: MousePointerClick },
    { label: 'Crescimento', value: '—', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Visão geral da plataforma</p>
        </div>
        <Button onClick={() => router.push('/creators')}>Gerenciar criadoras</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl border p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[13px] font-medium">{label}</span>
              <Icon className="text-muted-foreground/60 h-4 w-4" />
            </div>
            <div className="mt-2.5 text-[28px] leading-tight font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      {creators.length === 0 && (
        <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-2xl border py-20 text-center">
          <Users className="text-muted-foreground/30 h-12 w-12" />
          <div>
            <p className="font-semibold">Nenhuma criadora ainda</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Crie a primeira página de links para começar a rastrear cliques.
            </p>
          </div>
          <Button onClick={() => router.push('/creators')}>Criar primeira criadora</Button>
        </div>
      )}
    </div>
  )
}

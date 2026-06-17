'use client'

import { MousePointerClick } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { type CreatorListRow } from '@/lib/creators'

type Props = { creators: CreatorListRow[] }

export function CreatorsStats({ creators }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const totalClicks = creators.reduce((s, c) => s + c.clicks30d, 0)
  const live = creators.filter((c) => c.status === 'live').length

  const nf = (n: number) => n.toLocaleString(locale)

  // Build platform click totals in one pass (js-index-maps)
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
    {
      label: t('creators.statsActive'),
      value: String(creators.length),
      sub: t('creators.statsActiveSub', { live, drafts: creators.length - live }),
    },
    {
      label: t('creators.statsClicks'),
      value: nf(totalClicks),
      sub: t('creators.statsClicksSub'),
    },
    {
      label: t('creators.statsTopPlatform'),
      value: top?.label ?? '—',
      sub: top ? t('creators.statsTopPlatformSub', { pct: topPct }) : t('creators.statsTopPlatformNoData'),
    },
    {
      label: t('creators.statsPublished'),
      value: String(live),
      sub: t('creators.statsPublishedSub', { slug: '{slug}' }),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card rounded-2xl border p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[13px] font-medium">{c.label}</span>
            <MousePointerClick className="text-muted-foreground/60 h-4 w-4" />
          </div>
          <div className="mt-2.5 text-[28px] leading-tight font-extrabold">{c.value}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

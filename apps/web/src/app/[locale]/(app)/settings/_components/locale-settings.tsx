'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'

const LOCALES = [
  { value: 'br' as const, label: 'Português (Brasil)', flag: '🇧🇷' },
  { value: 'en' as const, label: 'English', flag: '🇺🇸' },
  { value: 'es' as const, label: 'Español', flag: '🇪🇸' },
]

type Locale = 'br' | 'en' | 'es'

export function LocaleSettings({ currentLocale }: { currentLocale: Locale }) {
  const [selected, setSelected] = useState<Locale>(currentLocale)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleSave(locale: Locale) {
    setSelected(locale)
    setSaved(false)
    startTransition(async () => {
      await fetch('/api/user/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      setSaved(true)
      // Redirect to same page with new locale prefix
      const segments = window.location.pathname.split('/')
      segments[1] = locale
      router.push(segments.join('/'))
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" />
          Idioma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Escolha o idioma da interface. A preferência fica salva na sua conta.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {LOCALES.map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => handleSave(value)}
              disabled={isPending}
              className={[
                'flex flex-1 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                selected === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent',
                isPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span className="text-base">{flag}</span>
              {label}
            </button>
          ))}
        </div>
        {saved && (
          <p className="text-muted-foreground mt-2 text-xs text-emerald-600">
            ✓ Idioma salvo com sucesso.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

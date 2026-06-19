'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Props = { preferredLocale: string; currentLocale: string }

// Silently redirects to the user's saved locale preference when it differs
// from the current URL locale. Runs once on mount after login.
export function LocaleSync({ preferredLocale, currentLocale }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const segments = pathname.split('/')
    if (segments[1] === currentLocale) {
      segments[1] = preferredLocale
      router.replace(segments.join('/'))
    }
  }, [])

  return null
}

import type { Metadata } from 'next'

const title = 'CreatorsLink — Páginas de links + analytics para criadoras'
const description =
  'Crie páginas de links lindas para cada criadora e acompanhe, por plataforma, exatamente de onde vêm os cliques — OnlyFans, Privacy, Instagram e mais, num painel só.'

// Declared explicitly here (rather than relying on the opengraph-image.tsx
// file convention alone) because that convention doesn't auto-attach to
// this page: opengraph-image lives at [locale]/opengraph-image.tsx (not
// [locale]/(landing)/opengraph-image.tsx — see the comment in that file for
// why), and Next.js doesn't associate a convention file outside a route
// group with metadata for a page inside it. Confirmed via Facebook's Sharing
// Debugger showing no og:image tag despite the image route itself working.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const imageUrl = `/${locale}/opengraph-image`
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      siteName: 'Creators Link',
      type: 'website',
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

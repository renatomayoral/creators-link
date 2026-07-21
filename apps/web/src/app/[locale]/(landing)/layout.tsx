import type { Metadata } from 'next'

const title = 'CreatorsLink — Páginas de links + analytics para criadoras'
const description =
  'Crie páginas de links lindas para cada criadora e acompanhe, por plataforma, exatamente de onde vêm os cliques — OnlyFans, Privacy, Instagram e mais, num painel só.'

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    siteName: 'Creators Link',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

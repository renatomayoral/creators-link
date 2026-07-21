import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import '@repo/ui/globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://creatorslink.org'),
  title: {
    default: 'Creators Link — Link na bio + analytics para criadoras',
    template: '%s | Creators Link',
  },
  description:
    'Crie páginas de links para suas criadoras e acompanhe, por plataforma, exatamente de onde vêm os cliques — OnlyFans, Privacy, Instagram e mais, num painel só.',
  keywords: [
    'link na bio',
    'analytics para criadoras',
    'página de links',
    'rastreio de cliques',
    'OnlyFans',
    'Privacy',
    'creators',
  ],
  authors: [{ name: 'Creators Link' }],
  creator: 'Creators Link',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', sizes: 'any' },
    ],
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://creatorslink.org',
    siteName: 'Creators Link',
    title: 'Creators Link — Link na bio + analytics para criadoras',
    description:
      'Páginas de links e rastreio de cliques por plataforma para criadoras de conteúdo. Painel completo, domínio próprio.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creators Link',
    description: 'Link na bio e analytics de cliques para criadoras de conteúdo.',
    creator: '@creatorslink',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#09090b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

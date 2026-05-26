import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@repo/ui/globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://nfsw-ai-studio.com'),
  title: {
    default: 'NFSW AI Studio — AI Adult Content Generator',
    template: '%s | NFSW AI Studio',
  },
  description:
    'Professional AI-powered adult content generation. Ultra-HD images with FLUX.1 and cinematic videos with Wan 2.2. Private, fast, unlimited creativity.',
  keywords: [
    'AI adult content generator',
    'NSFW AI',
    'AI image generation',
    'AI video generation',
    'FLUX.1',
    'Wan 2.2',
    'adult content SaaS',
  ],
  authors: [{ name: 'NFSW AI Studio' }],
  creator: 'NFSW AI Studio',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nfsw-ai-studio.com',
    siteName: 'NFSW AI Studio',
    title: 'NFSW AI Studio — AI Adult Content Generator',
    description:
      'Professional AI adult content generation. Ultra-HD images & cinematic videos. Private cloud. Instant GPU.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NFSW AI Studio',
    description: 'Professional AI adult content generation platform.',
    creator: '@nfswai',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#09090b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>{children}</body>
    </html>
  )
}

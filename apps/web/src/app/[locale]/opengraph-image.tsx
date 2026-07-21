import { ImageResponse } from 'next/og'

// Lives at [locale]/ instead of [locale]/(landing)/ (the "natural" spot,
// next to page.tsx) because opengraph-image inside a route group nested
// under a dynamic segment 404s in Next.js — see
// https://github.com/vercel/next.js/issues/48106 and #57349. This still
// covers the landing page (served at /[locale]) and acts as the fallback
// OG image for any other route under [locale] that doesn't define its own
// (e.g. /p/[slug] has its own generateMetadata with the creator's avatar).

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Same gradient icon as public/logo-icon.svg, inlined as a data URI so it
// renders inside the Satori-based ImageResponse (which can't read /public).
const LOGO_ICON_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNCIgZmlsbD0idXJsKCNnKSI+PC9yZWN0PgogIAogIDxwYXRoIGQ9Ik0zNiAxN0MzNiAxNyAyMSAxNyAyMSAzMkMyMSA0NyAzNiA0NyAzNiA0NyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiPjwvcGF0aD4KICAKICA8cGF0aCBkPSJNNDEgMTdMNDEgNDciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIj48L3BhdGg+CiAgCiAgPHBhdGggZD0iTTQxIDQ3TDUyIDQ3IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSI+PC9wYXRoPgogIAogIDxwYXRoIGQ9Ik00OCA0MUw1NSA0Ny41TDQ4IDU0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj48L3BhdGg+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjY0IiB5Mj0iNjQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzdDM0FFRCI+PC9zdG9wPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNFQzQ4OTkiPjwvc3RvcD4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4='

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg,#0b1220,#070e1c)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -140,
            width: 480,
            height: 480,
            borderRadius: 480,
            background: 'radial-gradient(circle, rgba(236,72,153,0.35), transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)',
            display: 'flex',
          }}
        />

        <img
          src={LOGO_ICON_DATA_URI}
          width={120}
          height={120}
          style={{ borderRadius: 26 }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            marginTop: 36,
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#ffffff' }}>Creators</span>
          <span style={{ color: '#ec4899' }}>Link</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 30,
            color: '#a3b1c6',
            textAlign: 'center',
            maxWidth: 820,
          }}
        >
          Link-in-bio, analytics e monetização para criadoras de conteúdo
        </div>
      </div>
    ),
    { ...size },
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

const DNS_PROVIDERS: { name: string; color: string; url: (d: string) => string }[] = [
  {
    name: 'Cloudflare',
    color: '#f6821f',
    url: (d) => `https://dash.cloudflare.com/?to=/:account/${d}/dns/records`,
  },
  {
    name: 'GoDaddy',
    color: '#1bdbdb',
    url: (d) => `https://dcc.godaddy.com/manage/${d}/dns`,
  },
  {
    name: 'Namecheap',
    color: '#de3723',
    url: (d) => `https://ap.www.namecheap.com/Domains/DomainControlPanel/${d}/advancedns`,
  },
  {
    name: 'Registro.br',
    color: '#009c3b',
    url: () => 'https://registro.br/tecnologia/ferramentas/dns/',
  },
  { name: 'HostGator', color: '#ff6600', url: () => 'https://www.hostgator.com.br/suporte' },
  { name: 'Locaweb', color: '#0070c0', url: () => 'https://www.locaweb.com.br/painel/' },
  { name: 'KingHost', color: '#7b2d8b', url: () => 'https://painel.kinghost.com.br/' },
  {
    name: 'Wix',
    color: '#faad00',
    url: () => 'https://manage.wix.com/premium-purchase-plan/dynamo',
  },
]

type Props = { domain: string }

export function DomainInstructions({ domain }: Props) {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'creatorslink.org'
  const [detected, setDetected] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)

  // Debounced NS lookup — fires 600ms after user stops typing
  useEffect(() => {
    const clean = domain
      .trim()
      .toLowerCase()
      .replace(/^www\./, '')
    if (!clean || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(clean)) {
      setDetected(null)
      return
    }
    setDetecting(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/domain-detect?domain=${encodeURIComponent(clean)}`)
        const { provider } = (await res.json()) as { provider: string | null }
        setDetected(provider)
      } catch {
        setDetected(null)
      } finally {
        setDetecting(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [domain])

  const cname = `${domain || 'seu-dominio.com'}  →  CNAME  →  ${appDomain}`
  const sorted = [
    ...DNS_PROVIDERS.filter((p) => p.name === detected),
    ...DNS_PROVIDERS.filter((p) => p.name !== detected),
  ]

  return (
    <div className="bg-muted/40 text-muted-foreground mt-3 rounded-lg border px-3.5 py-3 text-[12px] leading-relaxed">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-foreground font-semibold">
          Como configurar
          {detecting && (
            <span className="ml-2 text-[11px] font-normal opacity-60">detectando provedor…</span>
          )}
          {!detecting && detected && (
            <span className="ml-2 text-[11px] font-normal text-emerald-400">
              · {detected} detectado
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((p) => {
            const isDetected = detected === p.name
            return (
              <a
                key={p.name}
                href={p.url(domain || 'seu-dominio.com')}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-background inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all"
                style={{
                  borderColor: isDetected ? p.color : undefined,
                  color: isDetected ? p.color : undefined,
                  background: isDetected ? `${p.color}18` : undefined,
                  order: isDetected ? -1 : 0,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
              </a>
            )
          })}
        </div>
      </div>
      <ol className="mt-2.5 list-decimal space-y-1 pl-4">
        <li>
          {detected ? (
            <>
              Abra o <strong>{detected}</strong> (botão destacado acima) e crie um registro{' '}
              <strong>CNAME</strong>:
            </>
          ) : (
            <>
              No painel do seu provedor (botões acima), crie um registro <strong>CNAME</strong>:
            </>
          )}
        </li>
      </ol>
      <pre className="bg-background mt-2 overflow-x-auto rounded px-3 py-2 font-mono text-[11px]">
        {cname}
      </pre>
      <ol className="mt-2 list-decimal space-y-1 pl-4" start={2}>
        <li>Aguarde a propagação do DNS (pode levar até 24h).</li>
        <li>Salve o domínio acima — a página da criadora passará a responder no domínio dela.</li>
      </ol>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { OnboardingState } from './onboarding-wizard'

type Props = {
  state: OnboardingState
  updateState: (p: Partial<OnboardingState>) => void
  onNext: () => void
  onBack: () => void
}

const DNS_PROVIDERS: Record<string, { label: string; url: string }> = {
  cloudflare: { label: 'Cloudflare', url: 'https://dash.cloudflare.com' },
  godaddy: { label: 'GoDaddy', url: 'https://dcc.godaddy.com/manage' },
  namecheap: { label: 'Namecheap', url: 'https://ap.www.namecheap.com/domains/list' },
  'registro.br': { label: 'Registro.br', url: 'https://registro.br/painel' },
  hostgator: { label: 'HostGator', url: 'https://financeiro.hostgator.com.br' },
  locaweb: { label: 'Locaweb', url: 'https://painel.locaweb.com.br' },
  kinghost: { label: 'KingHost', url: 'https://painel.kinghost.com.br' },
  wix: { label: 'Wix', url: 'https://manage.wix.com' },
}

const APP_HOST = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? 'app.creatorslink.com'

export function StepDomain({ state, updateState, onNext, onBack }: Props) {
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!domain.trim() || !state.creatorId) { onNext(); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/creators/${state.creatorId}/domain`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar o domínio.')
        return
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Domínio próprio</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use um domínio personalizado para a página da criadora, como <code className="rounded bg-accent px-1.5 text-[12.5px]">babi.com.br</code>.
        </p>
      </div>

      {/* Domain input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold">Domínio</label>
        <input
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="babi.com.br"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500"
        />
      </div>

      {/* DNS instructions */}
      {cleanDomain && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[13.5px] font-semibold">Configure o DNS do seu domínio:</p>
          <p className="mb-3 text-[13px] text-muted-foreground">
            No painel do seu provedor de DNS, adicione o seguinte registro:
          </p>
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-background p-3 font-mono text-[12.5px]">
            <div>
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</div>
              <div>CNAME</div>
            </div>
            <div>
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Nome</div>
              <div>{cleanDomain.includes('.') ? cleanDomain.split('.')[0] : '@'}</div>
            </div>
            <div>
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Destino</div>
              <div className="text-blue-400">{APP_HOST}</div>
            </div>
          </div>
          <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Acesse seu provedor de DNS:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DNS_PROVIDERS).map(([key, p]) => (
              <a
                key={key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium hover:border-blue-500 hover:text-blue-400"
              >
                {p.label}
              </a>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            A propagação do DNS pode levar até 48h. Você pode salvar e configurar o domínio agora — o sistema verificará automaticamente.
          </p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-[13.5px] font-medium text-emerald-400">
          <span>✓</span> Domínio salvo. Aguardando propagação do DNS.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onNext} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Pular por agora
          </button>
          {!saved ? (
            <button
              onClick={handleSave}
              disabled={!cleanDomain || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
            >
              {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>}
              Salvar domínio
            </button>
          ) : (
            <button onClick={onNext} className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">
              Continuar →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// C6 Bank Pix API client
// Auth: OAuth 2.0 client_credentials + mTLS certificate
// Docs: https://developers.c6bank.com.br/apis

import https from 'node:https'

const BASE_URL = process.env['C6_API_URL'] ?? 'https://api.c6bank.com.br'
const CLIENT_ID = process.env['C6_CLIENT_ID'] ?? ''
const CLIENT_SECRET = process.env['C6_CLIENT_SECRET'] ?? ''
const CERT_PEM = process.env['C6_CERT_PEM'] ?? ''   // certificate (PEM string)
const KEY_PEM = process.env['C6_KEY_PEM'] ?? ''     // private key (PEM string)

type TokenCache = { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null

function makeAgent() {
  if (!CERT_PEM || !KEY_PEM) return undefined
  return new https.Agent({ cert: CERT_PEM, key: KEY_PEM, rejectUnauthorized: true })
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const agent = makeAgent()
  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: body.toString(),
    // @ts-expect-error — node fetch accepts agent
    agent,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`C6 Bank auth failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 30) * 1000,
  }
  return tokenCache.token
}

async function c6Fetch(path: string, init?: RequestInit) {
  const token = await getToken()
  const agent = makeAgent()
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    // @ts-expect-error
    agent,
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PixChargeInput = {
  /** Unique key for idempotency — use subscriptionId or a generated uuid */
  txid: string
  /** Amount in BRL (e.g. 29.90) */
  valor: number
  /** Fan's CPF (optional, improves reconciliation) */
  cpf?: string
  /** Fan name */
  nome?: string
  /** Description shown in the Pix confirmation screen */
  infoAdicionais?: string
  /** When the QR Code expires (seconds from now, default 3600) */
  expiracao?: number
  /** Split: Creators Link key + creator key */
  split: {
    plataformaKey: string   // Creators Link Pix key
    plataformaPct: number   // e.g. 10 = 10%
    criadoraKey: string     // Creator's Pix key
  }
}

export type PixChargeResult = {
  txid: string
  location: string        // URL to embed in QR Code image
  pixCopiaECola: string   // "copia e cola" string for the fan
  qrcode: string          // base64 or URL depending on C6 response
}

// ─── Create Pix charge (immediate) ───────────────────────────────────────────

export async function createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
  const body = {
    calendario: { expiracao: input.expiracao ?? 3600 },
    devedor: input.cpf
      ? { cpf: input.cpf.replace(/\D/g, ''), nome: input.nome ?? 'Fã' }
      : undefined,
    valor: { original: input.valor.toFixed(2) },
    chave: input.split.plataformaKey,
    infoAdicionais: input.infoAdicionais
      ? [{ nome: 'descricao', valor: input.infoAdicionais }]
      : undefined,
    // Split instruction — C6 Bank specific field
    split: {
      divisaoLiquidacao: [
        {
          chave: input.split.criadoraKey,
          percentual: (100 - input.split.plataformaPct).toFixed(2),
        },
      ],
    },
  }

  const res = await c6Fetch(`/pix/v2/cob/${input.txid}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`C6 Bank createPixCharge failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  return {
    txid: data.txid,
    location: data.location,
    pixCopiaECola: data.pixCopiaECola ?? '',
    qrcode: data.qrcode ?? '',
  }
}

// ─── Get charge status ────────────────────────────────────────────────────────

export type PixChargeStatus = 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA_PELO_USUARIO_RECEBEDOR' | 'REMOVIDA_PELO_PSP'

export async function getPixCharge(txid: string): Promise<{ status: PixChargeStatus; paidAt?: string }> {
  const res = await c6Fetch(`/pix/v2/cob/${txid}`)
  if (!res.ok) throw new Error(`C6 Bank getPixCharge failed: ${res.status}`)
  const data = await res.json()
  return {
    status: data.status,
    paidAt: data.pix?.[0]?.horario,
  }
}

// Patreon OAuth 2.0 helpers
// Docs: https://docs.patreon.com/#oauth

const PATREON_AUTH = 'https://www.patreon.com/oauth2/authorize'
const PATREON_TOKEN = 'https://www.patreon.com/api/oauth2/token'
const PATREON_API = 'https://www.patreon.com/api/oauth2/v2'

export const PATREON_SCOPES = [
  'identity',
  'identity[email]',
  'campaigns',
  'campaigns.members',
  'campaigns.members[email]',
]

export function getPatreonClientId() {
  const id = process.env.PATREON_CLIENT_ID
  if (!id) throw new Error('PATREON_CLIENT_ID env var not set')
  return id
}

function getPatreonClientSecret() {
  const s = process.env.PATREON_CLIENT_SECRET
  if (!s) throw new Error('PATREON_CLIENT_SECRET env var not set')
  return s
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/patreon/callback`
}

export function buildPatreonAuthUrl(state: string): string {
  const url = new URL(PATREON_AUTH)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', getPatreonClientId())
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('scope', PATREON_SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

export type PatreonTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
}

export async function exchangePatreonCode(code: string): Promise<PatreonTokenResponse> {
  const res = await fetch(PATREON_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: getPatreonClientId(),
      client_secret: getPatreonClientSecret(),
      redirect_uri: getRedirectUri(),
    }),
  })
  if (!res.ok) throw new Error(`Patreon token exchange failed: ${await res.text()}`)
  return res.json()
}

export async function refreshPatreonToken(refreshToken: string): Promise<PatreonTokenResponse> {
  const res = await fetch(PATREON_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getPatreonClientId(),
      client_secret: getPatreonClientSecret(),
    }),
  })
  if (!res.ok) throw new Error('Patreon token refresh failed')
  return res.json()
}

export async function patreonGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${PATREON_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Patreon API error ${res.status}: ${path}`)
  return res.json()
}

type PatreonIdentityResponse = {
  data: {
    id: string
    attributes: {
      full_name: string
      email: string
      vanity: string | null
      url: string
    }
    relationships?: {
      campaign?: { data?: { id: string; type: string } }
    }
  }
  included?: Array<{
    type: string
    id: string
    attributes: { patron_count?: number; creation_name?: string; url?: string }
  }>
}

// Fetch creator identity + campaign in one call
export async function getPatreonIdentity(accessToken: string): Promise<PatreonIdentityResponse> {
  return patreonGet<PatreonIdentityResponse>(
    '/identity?fields%5Buser%5D=full_name,email,vanity,url&include=campaign&fields%5Bcampaign%5D=patron_count,creation_name,url',
    accessToken,
  )
}

// Extract campaignId from identity response
export function extractCampaignId(identity: PatreonIdentityResponse): string | null {
  return identity.data.relationships?.campaign?.data?.id ?? null
}

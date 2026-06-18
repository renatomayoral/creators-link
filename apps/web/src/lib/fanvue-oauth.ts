// Fanvue OAuth 2.0 helpers (Authorization Code + PKCE)
// Docs: https://api.fanvue.com/docs/llms.txt

const FANVUE_ISSUER = process.env.FANVUE_OAUTH_ISSUER ?? 'https://auth.fanvue.com'
const FANVUE_API = process.env.FANVUE_API_BASE_URL ?? 'https://api.fanvue.com'
const API_VERSION = '2025-06-26'

export const FANVUE_SCOPES = [
  'openid',
  'offline_access',
  'offline',
  'read:self',
  'read:subscribers',
  'read:earnings',
  'write:posts',
  'write:messages',
]

export function getFanvueClientId() {
  const id = process.env.FANVUE_CLIENT_ID
  if (!id) throw new Error('FANVUE_CLIENT_ID env var not set')
  return id
}

export function getFanvueClientSecret() {
  const s = process.env.FANVUE_CLIENT_SECRET
  if (!s) throw new Error('FANVUE_CLIENT_SECRET env var not set')
  return s
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/fanvue/callback`
}

// Build the Fanvue authorization URL
export function buildAuthUrl(state: string, scopes = FANVUE_SCOPES): string {
  const url = new URL(`${FANVUE_ISSUER}/oauth2/auth`)
  url.searchParams.set('client_id', getFanvueClientId())
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

export type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

// Exchange authorization code for tokens
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${FANVUE_ISSUER}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getFanvueClientId(),
      client_secret: getFanvueClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fanvue token exchange failed: ${err}`)
  }
  return res.json()
}

// Refresh an expired access token
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${FANVUE_ISSUER}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getFanvueClientId(),
      client_secret: getFanvueClientSecret(),
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Fanvue token refresh failed')
  return res.json()
}

// Call Fanvue API with a given access token
export async function fanvueGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${FANVUE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Fanvue-API-Version': API_VERSION,
    },
  })
  if (!res.ok) throw new Error(`Fanvue API error ${res.status}: ${path}`)
  return res.json()
}

// Get the current Fanvue user (to store UUID + handle after OAuth)
export async function getFanvueCurrentUser(accessToken: string) {
  return fanvueGet<{
    uuid: string
    handle: string
    displayName: string
    email: string
    avatarUrl: string | null
    isCreator: boolean
  }>('/v1/users/me', accessToken)
}

import { createHash } from 'node:crypto'

// ─── OnlyFans dynamic request signing ────────────────────────────────────────
//
// OnlyFans' internal API requires four dynamic headers on every request.
// The signing algorithm is well-documented in multiple open-source projects
// (DIGITALCRIMINALS/OnlyFans, datawhores/OF-Scraper, etc.):
//
//   sign = SHA1( prefix + "\n" + path + "\n" + epoch_ms + "\n" + useragent )
//   where prefix comes from their static "rules" array (index derived from epoch_ms)
//
// The `rules` array and `app-token` are extracted from the OF web app JS bundle.
// They rotate occasionally — update STATIC_VALS when requests start returning 401.

const STATIC_VALS = {
  // app-token: static value present in the OF web bundle (public, not a secret)
  appToken: 'danke',
  // rules: prefix strings used in the sign hash, cycled by epoch index
  rules: [
    '0d30f6e4-b06c-4f0f-8340-d5b6c78ffcca',
    '4a5c5b36-a12f-4ba4-8c83-5b75a26c4f21',
    '9a2d1f17-3c8e-4b19-9a42-5e78c91a3b50',
    'ad2db35a-fae6-4d4e-ab0e-e3f69e2e4b83',
  ],
  // user-agent to send (matching what the browser session uses reduces ban risk)
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

/**
 * Generates the dynamic auth headers required by every OnlyFans API call.
 * @param path - URL path, e.g. "/api2/v2/users/me"
 * @param userId - the numeric user-id from the session cookie
 */
export function buildOfHeaders(path: string, userId: string, cookieStr: string): Record<string, string> {
  const epochMs = Date.now()
  const epochSec = Math.floor(epochMs / 1000).toString()

  // Pick prefix by cycling through rules
  const prefix = STATIC_VALS.rules[epochMs % STATIC_VALS.rules.length]!

  // sign = SHA1 of newline-joined parts
  const raw = [prefix, path, epochSec, STATIC_VALS.userAgent].join('\n')
  const sign = createHash('sha1').update(raw).digest('hex')

  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'app-token': STATIC_VALS.appToken,
    'x-bc': buildXBc(epochSec),
    sign,
    time: epochSec,
    'user-id': userId,
    'User-Agent': STATIC_VALS.userAgent,
    Cookie: cookieStr,
    Referer: 'https://onlyfans.com/',
    Origin: 'https://onlyfans.com',
  }
}

// x-bc: SHA1 of reversed epochSec + static salt (varies by OF version)
function buildXBc(epochSec: string): string {
  const salt = 'wzPFaA/UdSWdMt5F'
  return createHash('sha1').update(epochSec.split('').reverse().join('') + salt).digest('hex')
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// Creators export their browser cookies via an extension (e.g. "Cookie-Editor",
// "EditThisCookie") in JSON or Netscape format. We parse either format and
// produce the raw cookie string + user-id needed by the client.

export type ParsedSession = {
  cookieStr: string
  userId: string
}

type CookieEditorEntry = {
  name: string
  value: string
  domain?: string
}

// Parse JSON array exported by Cookie-Editor / EditThisCookie
export function parseCookieEditorJson(json: string): ParsedSession {
  let entries: CookieEditorEntry[]
  try {
    entries = JSON.parse(json) as CookieEditorEntry[]
  } catch {
    throw new Error('Invalid cookie JSON — paste the full array from the extension')
  }

  if (!Array.isArray(entries)) throw new Error('Expected a JSON array of cookie objects')

  const relevant = entries.filter(
    (e) => !e.domain || e.domain.includes('onlyfans.com'),
  )

  const cookieStr = relevant.map((e) => `${e.name}=${e.value}`).join('; ')

  const sess = relevant.find((e) => e.name === 'sess')
  if (!sess) throw new Error('No "sess" cookie found — make sure you exported from onlyfans.com')

  // user-id is in the URL or in the "auth_id" cookie if present
  const authId = relevant.find((e) => e.name === 'auth_id')
  const userId = authId?.value ?? extractUserIdFromSess(sess.value)

  return { cookieStr, userId }
}

// Parse Netscape / curl format: "sess=xxx; auth_id=yyy; ..."
export function parseCookieString(raw: string): ParsedSession {
  const pairs = raw
    .split(/;\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const idx = p.indexOf('=')
      return { name: p.slice(0, idx), value: p.slice(idx + 1) }
    })

  const sess = pairs.find((p) => p.name === 'sess')
  if (!sess) throw new Error('No "sess" cookie found')

  const authId = pairs.find((p) => p.name === 'auth_id')
  const userId = authId?.value ?? extractUserIdFromSess(sess.value)

  return { cookieStr: raw, userId }
}

// The sess cookie JWT payload contains the user id as "id" or "u" claim
function extractUserIdFromSess(sessValue: string): string {
  try {
    // sess is a JWT: header.payload.signature (base64url)
    const parts = sessValue.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'))
      const id = payload['id'] ?? payload['u'] ?? payload['sub']
      if (id) return String(id)
    }
  } catch {
    // not a JWT — fall through
  }
  throw new Error(
    'Could not extract user-id from sess cookie. ' +
      'Add "auth_id" cookie or pass userId manually.',
  )
}

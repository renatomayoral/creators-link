/**
 * ComfyUI root proxy — GET /api/comfyui/
 * Proxies the ComfyUI HTML index page so the iframe can load it.
 * ([...path] requires ≥1 segment, so the root needs its own handler)
 *
 * Important: Next.js strips trailing slashes, so the browser ends up with
 * base URL /api/ instead of /api/comfyui/. We inject <base href="/api/comfyui/">
 * so all relative asset URLs (assets/, user.css, api/userdata/…) resolve correctly.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ensureTunnel } from '@/lib/comfyui-tunnel'

const COMFYUI_BASE = 'http://127.0.0.1:8188'

export async function GET(req: NextRequest) {
  try {
    await ensureTunnel()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tunnel failed'
    return new NextResponse(
      `<html><body style="background:#111;color:#f87171;font-family:sans-serif;padding:2rem">
        <h2>ComfyUI Unavailable</h2><p>${message}</p>
       </body></html>`,
      { status: 503, headers: { 'content-type': 'text/html' } },
    )
  }

  try {
    const search = req.nextUrl.search ?? ''
    const response = await fetch(`${COMFYUI_BASE}/${search}`, {
      headers: {
        accept: 'text/html,*/*',
        origin: 'http://127.0.0.1:8188',
        referer: 'http://127.0.0.1:8188/',
      },
    })

    const resHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'content-security-policy'].includes(key.toLowerCase())) {
        resHeaders.set(key, value)
      }
    })
    resHeaders.set('x-frame-options', 'SAMEORIGIN')

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      let html = await response.text()
      // 1. <base> fixes relative URLs in HTML attributes (href, src, etc.)
      // 2. The inline script fixes window.location.pathname BEFORE ComfyUI's JS
      //    runs — ComfyUI computes api_base as:
      //      location.pathname.split('/').slice(0,-1).join('/')
      //    Without trailing slash: '/api/comfyui' → base '/api' → double /api/api/
      //    With trailing slash:    '/api/comfyui/' → base '/api/comfyui' → correct
      html = html.replace(
        /(<head[^>]*>)/i,
        `$1<base href="/api/comfyui/"><script>` +
        `if(!location.pathname.endsWith('/'))` +
        `history.replaceState(null,'',location.pathname+'/'+location.search+location.hash);` +
        `<\/script>`,
      )
      resHeaders.set('content-type', 'text/html; charset=utf-8')
      resHeaders.delete('content-length')
      return new NextResponse(html, { status: response.status, headers: resHeaders })
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'ComfyUI request failed', detail: message }, { status: 502 })
  }
}

/**
 * ComfyUI Proxy — /api/comfyui/[...path]
 *
 * Proxies all HTTP requests to ComfyUI running on localhost:8188,
 * automatically establishing an SSH tunnel to the GCP VM if needed.
 *
 * Usage from client code:
 *   fetch('/api/comfyui/prompt', { method: 'POST', body: ... })
 *   fetch('/api/comfyui/history/abc123')
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ensureTunnel } from '@/lib/comfyui-tunnel'

const COMFYUI_BASE = 'http://127.0.0.1:8188'

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // Ensure SSH tunnel is established
    await ensureTunnel()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tunnel failed'
    return NextResponse.json(
      { error: 'ComfyUI tunnel unavailable', detail: message },
      { status: 503 },
    )
  }

  const { path } = await params
  const pathStr = path.join('/')
  const search = req.nextUrl.search ?? ''
  const targetUrl = `${COMFYUI_BASE}/${pathStr}${search}`

  // Forward headers — strip host/connection and spoof origin so ComfyUI's
  // CORS origin check passes (it rejects requests whose Origin != server host).
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (['host', 'connection', 'origin', 'referer'].includes(key.toLowerCase())) return
    headers.set(key, value)
  })
  // Present as same-origin to ComfyUI
  headers.set('origin', 'http://127.0.0.1:8188')
  headers.set('referer', 'http://127.0.0.1:8188/')

  // Stream body for POST/PUT
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method)

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error — Node 18+ fetch supports duplex
      duplex: hasBody ? 'half' : undefined,
    })

    // Forward response headers
    const resHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        resHeaders.set(key, value)
      }
    })

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'ComfyUI request failed', detail: message },
      { status: 502 },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler

// App Router streams bodies natively — no bodyParser config needed

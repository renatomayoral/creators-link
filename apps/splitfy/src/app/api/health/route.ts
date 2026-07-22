import { NextResponse } from 'next/server'

// GET /api/health — liveness probe.
export function GET() {
  return NextResponse.json({ ok: true })
}

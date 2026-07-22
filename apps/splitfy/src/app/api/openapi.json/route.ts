import { NextResponse } from 'next/server'
import { buildOpenApiDocument } from '@/lib/openapi'

// GET /api/openapi.json — public spec consumed by /docs/api (Scalar) and by
// integrators directly.
export function GET() {
  return NextResponse.json(buildOpenApiDocument())
}

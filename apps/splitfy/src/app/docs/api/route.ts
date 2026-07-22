import { ApiReference } from '@scalar/nextjs-api-reference'

// GET /docs/api — interactive API reference (Scalar), reading the spec from
// /api/openapi.json. Public — this is sales/integration material, not a
// dashboard page, so it needs no session.
export const GET = ApiReference({
  url: '/api/openapi.json',
})

import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
import { sql } from 'drizzle-orm'
import { db } from '@repo/db'

// TEMPORARY debug route to diagnose Cloud Run -> Supabase connectivity.
// Requires header Authorization: Bearer <CRON_SECRET>. Remove after use.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env['CRON_SECRET']}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const connectionString = process.env['DATABASE_URL'] ?? ''
  const url = new URL(connectionString)
  const result: Record<string, unknown> = {
    host: url.hostname,
    port: url.port,
  }

  try {
    const start = Date.now()
    const addresses = await dns.resolve4(url.hostname)
    result['dnsResolve4'] = addresses
    result['dnsMs'] = Date.now() - start
  } catch (err) {
    result['dnsError'] = String(err)
  }

  try {
    const start = Date.now()
    await db.execute(sql`select 1`)
    result['queryMs'] = Date.now() - start
    result['queryOk'] = true
  } catch (err) {
    result['queryError'] = String(err)
  }

  return NextResponse.json(result)
}

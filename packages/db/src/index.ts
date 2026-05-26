import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

// Lazy singleton — connection is created on first use, not at import time.
// This allows Next.js to build without DATABASE_URL being set.
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (_db) return _db

  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Disable prefetch for serverless environments (Cloud Run, Next.js)
  const client = postgres(connectionString, { prepare: false })
  _db = drizzle(client, { schema })
  return _db
}

// Proxy that defers connection until first property access
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export { schema }
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

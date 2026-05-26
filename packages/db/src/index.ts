import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

// Lazy singleton — connection is created on first use, not at import time.
// This allows Next.js to build without DATABASE_URL being set.
let _db: DB | null = null

function getDb(): DB {
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
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export { schema }
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

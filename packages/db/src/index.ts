import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

// Use globalThis to survive Next.js hot-module reloads in dev,
// preventing a new pool being created on every file change.
const globalForDb = globalThis as unknown as { _db: DB | undefined }

function getDb(): DB {
  if (globalForDb._db) return globalForDb._db

  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, {
    prepare: false, // required for serverless (Cloud Run / Next.js)
    max: 5, // cap pool size — remote PG has limited connection slots
    idle_timeout: 20,
    connect_timeout: 30, // Supabase pooler can be slow on Cloud Run cold starts
  })
  globalForDb._db = drizzle(client, { schema })
  return globalForDb._db
}

// Proxy that defers connection until first property access
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export { schema }
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

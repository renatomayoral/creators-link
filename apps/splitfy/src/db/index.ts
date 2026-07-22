import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

// Use globalThis to survive Next.js hot-module reloads in dev, preventing a new
// pool being created on every file change. Mirrors the apps/web db proxy.
const globalForDb = globalThis as unknown as { _splitfyDb: DB | undefined }

function getDb(): DB {
  if (globalForDb._splitfyDb) return globalForDb._splitfyDb

  const connectionString = process.env['SPLITFY_DATABASE_URL']
  if (!connectionString) {
    throw new Error('SPLITFY_DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, {
    prepare: false, // required for serverless (Cloud Run / Next.js)
    max: 5,
    idle_timeout: 20,
    connect_timeout: 30,
  })
  globalForDb._splitfyDb = drizzle(client, { schema })
  return globalForDb._splitfyDb
}

// Proxy that defers connection until first property access.
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export { schema }

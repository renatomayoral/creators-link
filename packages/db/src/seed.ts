import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { platform } from './creators.ts'

// Canonical platform keys — must match LOGO_MAP in
// apps/web/src/components/platform-logos.tsx
const PLATFORMS = [
  { key: 'onlyfans', label: 'OnlyFans', color: '#00AFF0', baseUrl: 'https://onlyfans.com', sortOrder: 0 },
  { key: 'fanvue', label: 'Fanvue', color: '#6D5DFC', baseUrl: 'https://www.fanvue.com', sortOrder: 1 },
  { key: 'privacy', label: 'Privacy', color: '#FF5A5F', baseUrl: 'https://privacy.com.br', sortOrder: 2 },
  { key: 'fansly', label: 'Fansly', color: '#1DA1F2', baseUrl: 'https://fansly.com', sortOrder: 3 },
  { key: 'instagram', label: 'Instagram', color: '#C13584', baseUrl: 'https://instagram.com', sortOrder: 4 },
  { key: 'tiktok', label: 'TikTok', color: '#010101', baseUrl: 'https://tiktok.com', sortOrder: 5 },
  { key: 'telegram', label: 'Telegram', color: '#26A5E4', baseUrl: 'https://t.me', sortOrder: 6 },
  { key: 'patreon', label: 'Patreon', color: '#FF424D', baseUrl: 'https://www.patreon.com', sortOrder: 7 },
]

async function seed() {
  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')

  const client = postgres(connectionString, { prepare: false, max: 1 })
  const db = drizzle(client)

  for (const p of PLATFORMS) {
    const existing = await db.select({ id: platform.id }).from(platform).where(eq(platform.key, p.key))
    if (existing.length) {
      console.log(`skip  ${p.key} (already exists)`)
      continue
    }
    await db.insert(platform).values({ id: randomUUID(), ...p, active: true })
    console.log(`insert ${p.key}`)
  }

  await client.end()
  console.log('done')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})

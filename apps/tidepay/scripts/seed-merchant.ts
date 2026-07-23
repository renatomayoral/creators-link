import { randomBytes, createHash, randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from '../src/db/schema.ts'

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`
}

const connectionString = process.env['TIDEPAY_DATABASE_URL']
if (!connectionString) throw new Error('TIDEPAY_DATABASE_URL environment variable is not set')
const client = postgres(connectionString, { prepare: false, max: 1 })
const db = drizzle(client, { schema })

// Creates the first merchant (creatorslink) and prints its raw API key once.
// Usage: pnpm db:seed-merchant -- --name "Creators Link" --takeRate 2.5 --webhookUrl https://...
async function main() {
  const args = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx >= 0 ? args[idx + 1] : undefined
  }

  const name = get('--name') ?? 'Creators Link'
  const takeRatePct = get('--takeRate') ?? '2.50'
  const webhookUrl = get('--webhookUrl')

  const rawKey = `sfy_${randomBytes(24).toString('hex')}`
  const apiKeyHash = createHash('sha256').update(rawKey).digest('hex')
  const apiKeyPrefix = rawKey.slice(0, 8)
  const webhookSecret = randomBytes(32).toString('hex')

  const [created] = await db
    .insert(schema.merchant)
    .values({
      id: newId('merchant'),
      name,
      apiKeyHash,
      apiKeyPrefix,
      takeRatePct,
      webhookUrl,
      webhookSecret,
    })
    .returning()

  console.log('Merchant created:', created?.id)
  console.log('Raw API key (store this now, it will not be shown again):', rawKey)
  console.log('Webhook secret (share with the merchant to verify webhooks):', webhookSecret)
  await client.end()
  process.exit(0)
}

main().catch(async (err) => {
  console.error(err)
  await client.end()
  process.exit(1)
})

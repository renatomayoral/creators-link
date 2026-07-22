import { randomBytes, createHash } from 'node:crypto'
import { db, schema } from '../src/db'
import { newId } from '../src/lib/ids'

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
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

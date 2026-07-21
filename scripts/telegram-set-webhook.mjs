/**
 * Registers the Telegram Bot API webhook so bot updates (button taps,
 * commands) reach /api/telegram/webhook. Run once after deploy, or whenever
 * NEXT_PUBLIC_APP_URL / TELEGRAM_WEBHOOK_SECRET changes.
 *
 * Usage:
 *   node --env-file=.env scripts/telegram-set-webhook.mjs
 */

const botToken = process.env.TELEGRAM_BOT_TOKEN
const appUrl = process.env.NEXT_PUBLIC_APP_URL
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!botToken || !appUrl || !secret) {
  console.error('Missing TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL, or TELEGRAM_WEBHOOK_SECRET in .env')
  process.exit(1)
}

const webhookUrl = `${appUrl}/api/telegram/webhook`

const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
})

const data = await res.json()
console.log(JSON.stringify(data, null, 2))
if (!data.ok) process.exit(1)

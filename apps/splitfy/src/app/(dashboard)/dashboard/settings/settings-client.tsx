'use client'

import { useState } from 'react'

export function SettingsClient({ initialWebhookUrl, apiKeyPrefix }: { initialWebhookUrl: string | null; apiKeyPrefix: string }) {
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? '')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [webhookMessage, setWebhookMessage] = useState('')

  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [regeneratingKey, setRegeneratingKey] = useState(false)

  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null)
  const [regeneratingSecret, setRegeneratingSecret] = useState(false)

  async function saveWebhookUrl(e: React.FormEvent) {
    e.preventDefault()
    setSavingWebhook(true)
    setWebhookMessage('')
    const res = await fetch('/api/dashboard/merchant/webhook', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    })
    setSavingWebhook(false)
    setWebhookMessage(res.ok ? 'Saved.' : 'Failed to save.')
  }

  async function regenerateApiKey() {
    if (!confirm('This invalidates your current API key immediately. Continue?')) return
    setRegeneratingKey(true)
    const res = await fetch('/api/dashboard/merchant/api-key', { method: 'POST' })
    const data = await res.json()
    setRegeneratingKey(false)
    if (res.ok) setNewApiKey(data.rawApiKey)
  }

  async function regenerateWebhookSecret() {
    if (!confirm('This invalidates your current webhook secret immediately. Continue?')) return
    setRegeneratingSecret(true)
    const res = await fetch('/api/dashboard/merchant/webhook', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ regenerateSecret: true }),
    })
    const data = await res.json()
    setRegeneratingSecret(false)
    if (res.ok) setNewWebhookSecret(data.webhookSecret)
  }

  return (
    <div className="max-w-md space-y-8">
      <section className="space-y-3 rounded-lg border border-neutral-800 p-6">
        <h2 className="font-semibold">API key</h2>
        <p className="text-sm text-neutral-400">
          Current key prefix: <code>{apiKeyPrefix}…</code>
        </p>
        {newApiKey ? (
          <div className="space-y-2">
            <p className="text-sm text-green-400">Copy your new key now — it will not be shown again.</p>
            <code className="block break-all rounded-md bg-neutral-900 p-3 text-sm">{newApiKey}</code>
          </div>
        ) : (
          <button
            onClick={regenerateApiKey}
            disabled={regeneratingKey}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {regeneratingKey ? 'Regenerating…' : 'Regenerate API key'}
          </button>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 p-6">
        <h2 className="font-semibold">Webhook</h2>
        <form onSubmit={saveWebhookUrl} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-neutral-300">Webhook URL</label>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-app.com/api/webhooks/splitfy"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-600"
            />
          </div>
          {webhookMessage && <p className="text-sm text-neutral-400">{webhookMessage}</p>}
          <button
            type="submit"
            disabled={savingWebhook}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {savingWebhook ? 'Saving…' : 'Save'}
          </button>
        </form>

        {newWebhookSecret ? (
          <div className="space-y-2">
            <p className="text-sm text-green-400">Copy your new webhook secret now — it will not be shown again.</p>
            <code className="block break-all rounded-md bg-neutral-900 p-3 text-sm">{newWebhookSecret}</code>
          </div>
        ) : (
          <button
            onClick={regenerateWebhookSecret}
            disabled={regeneratingSecret}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {regeneratingSecret ? 'Regenerating…' : 'Regenerate webhook secret'}
          </button>
        )}
      </section>
    </div>
  )
}

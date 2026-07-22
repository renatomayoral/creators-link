'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OnboardingForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [rawApiKey, setRawApiKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/dashboard/merchant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }
    setRawApiKey(data.rawApiKey)
  }

  if (rawApiKey) {
    return (
      <div className="space-y-4 rounded-lg border border-neutral-800 p-6">
        <p className="font-medium text-green-400">Merchant created.</p>
        <p className="text-sm text-neutral-400">
          Copy your API key now — it will not be shown again. Use it in the <code>X-API-Key</code> header when calling the
          splitfy REST API.
        </p>
        <code className="block break-all rounded-md bg-neutral-900 p-3 text-sm">{rawApiKey}</code>
        <button onClick={() => router.push('/dashboard')} className="rounded-md bg-white px-4 py-2 font-medium text-black">
          Continue to dashboard
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm text-neutral-300">
          Merchant name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Creators Link"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-600"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create merchant'}
      </button>
    </form>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { EVM_TOKENS } from '@/lib/crypto-coins'

type Plan = {
  id: string
  name: string
  amount: string
  tokenKey: string
  intervalDay: number
  merchantDestinationWallet: string
  active: boolean
}

export function PlansClient() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenKey, setTokenKey] = useState(EVM_TOKENS[0]?.key ?? '')
  const [intervalDay, setIntervalDay] = useState('30')
  const [wallet, setWallet] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadPlans() {
    setLoading(true)
    const res = await fetch('/api/dashboard/plans')
    const data = await res.json()
    setPlans(data.plans ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/dashboard/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        amount,
        tokenKey,
        intervalDay: Number(intervalDay),
        merchantDestinationWallet: wallet,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setName('')
    setAmount('')
    setWallet('')
    await loadPlans()
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-neutral-800 p-6">
        <h2 className="font-semibold">New plan</h2>
        <Field label="Name" value={name} onChange={setName} placeholder="VIP Monthly" required />
        <Field label="Amount (decimal)" value={amount} onChange={setAmount} placeholder="9.90" required />
        <div className="space-y-1.5">
          <label className="text-sm text-neutral-300">Token</label>
          <select
            value={tokenKey}
            onChange={(e) => setTokenKey(e.target.value)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white"
          >
            {EVM_TOKENS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.ticker} ({t.chainLabel})
              </option>
            ))}
          </select>
        </div>
        <Field label="Interval (days)" value={intervalDay} onChange={setIntervalDay} type="number" required />
        <Field label="Merchant destination wallet" value={wallet} onChange={setWallet} placeholder="0x…" required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create plan'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-semibold">Your plans</h2>
        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-neutral-500">No plans yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Token</th>
                <th className="pb-2">Interval</th>
                <th className="pb-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-neutral-800">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.amount}</td>
                  <td className="py-2">{p.tokenKey}</td>
                  <td className="py-2">{p.intervalDay}d</td>
                  <td className="py-2">{p.active ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-neutral-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-600"
        {...rest}
      />
    </div>
  )
}

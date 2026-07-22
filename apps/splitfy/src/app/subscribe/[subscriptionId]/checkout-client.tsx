'use client'

import { useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, useConnect, useReadContract, useWriteContract } from 'wagmi'
import { Providers } from '../../providers'

type CheckoutInfo = {
  id: string
  status: string
  planName: string
  amount: string
  ticker: string
  chainId: number
  tokenAddress: `0x${string}`
  operatorWallet: `0x${string}`
  requiredAllowance: string
}

function CheckoutInner({ subscriptionId }: { subscriptionId: string }) {
  const [info, setInfo] = useState<CheckoutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect } = useConnect()
  const { writeContract, isPending: isApproving } = useWriteContract()

  useEffect(() => {
    fetch(`/api/checkout/${subscriptionId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Subscription not found'))))
      .then(setInfo)
      .catch((err) => setError(err.message))
  }, [subscriptionId])

  const { data: allowance } = useReadContract({
    address: info?.tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && info ? [address, info.operatorWallet] : undefined,
    query: { enabled: Boolean(address && info) },
  })

  if (error) return <p className="text-red-400">{error}</p>
  if (!info) return <p className="text-neutral-400">Loading…</p>

  const wrongChain = isConnected && chainId !== info.chainId
  const hasSufficientAllowance = allowance !== undefined && allowance >= BigInt(info.requiredAllowance)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-800 p-6">
      <h1 className="text-xl font-semibold">{info.planName}</h1>
      <p className="text-neutral-400">
        {info.amount} {info.ticker} recurring
      </p>

      {!isConnected && (
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="rounded-md bg-white px-4 py-2 font-medium text-black"
            >
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}

      {isConnected && wrongChain && <p className="text-yellow-400">Please switch your wallet to chain {info.chainId}.</p>}

      {isConnected && !wrongChain && !hasSufficientAllowance && (
        <button
          disabled={isApproving}
          onClick={() =>
            writeContract({
              address: info.tokenAddress,
              abi: erc20Abi,
              functionName: 'approve',
              args: [info.operatorWallet, BigInt(info.requiredAllowance)],
            })
          }
          className="rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {isApproving ? 'Approving…' : `Approve ${info.ticker}`}
        </button>
      )}

      {isConnected && !wrongChain && hasSufficientAllowance && <p className="text-green-400">Allowance granted — subscription active.</p>}
    </div>
  )
}

export function CheckoutClient({ subscriptionId }: { subscriptionId: string }) {
  return (
    <Providers>
      <CheckoutInner subscriptionId={subscriptionId} />
    </Providers>
  )
}

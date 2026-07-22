import { arbitrum, base, bsc, polygon, type Chain } from 'viem/chains'
import { env } from '@/env'

// Number of confirmations to wait for before treating a leg as final. Tuned
// per chain's practical finality — Arbitrum inherits Ethereum L1 security
// quickly via its sequencer, the others need more blocks to be safe against
// reorgs.
export const CONFIRMATIONS: Record<number, number> = {
  137: 5, // Polygon
  42161: 1, // Arbitrum
  56: 5, // BNB Smart Chain
  8453: 3, // Base
}

const CHAIN_BY_ID: Record<number, Chain> = {
  137: polygon,
  42161: arbitrum,
  56: bsc,
  8453: base,
}

export function getViemChain(chainId: number): Chain {
  const chain = CHAIN_BY_ID[chainId]
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`)
  return chain
}

export function getRpcUrl(chainId: number): string {
  const override = env.rpcUrl(chainId)
  if (override) return override
  const chain = getViemChain(chainId)
  const fallback = chain.rpcUrls.default.http[0]
  if (!fallback) throw new Error(`No default RPC URL for chainId ${chainId}`)
  return fallback
}

export function getConfirmations(chainId: number): number {
  return CONFIRMATIONS[chainId] ?? 3
}

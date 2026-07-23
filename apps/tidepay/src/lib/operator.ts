import { createWalletClient, createPublicClient, http, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { env } from '@/env'
import { getViemChain, getRpcUrl } from './chains'

// The operator is tidepay's hot signer: subscribers grant it an ERC-20
// allowance, and each billing cycle it pulls the gross amount then forwards
// the merchant + platform shares. It holds funds only transiently in transit
// within a single cycle. See CLAUDE.md-equivalent security notes in the plan:
// this key must live in a secret manager in production, never in the repo.

function normalizePrivateKey(key: string): `0x${string}` {
  return (key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`
}

const globalForOperator = globalThis as unknown as {
  _operatorAccount: ReturnType<typeof privateKeyToAccount> | undefined
}

export function getOperatorAccount() {
  if (!globalForOperator._operatorAccount) {
    globalForOperator._operatorAccount = privateKeyToAccount(normalizePrivateKey(env.operatorPrivateKey))
  }
  return globalForOperator._operatorAccount
}

export function getOperatorAddress(): Address {
  return getOperatorAccount().address
}

export function getPublicClient(chainId: number) {
  return createPublicClient({
    chain: getViemChain(chainId),
    transport: http(getRpcUrl(chainId)),
  })
}

export function getOperatorWalletClient(chainId: number) {
  return createWalletClient({
    account: getOperatorAccount(),
    chain: getViemChain(chainId),
    transport: http(getRpcUrl(chainId)),
  })
}

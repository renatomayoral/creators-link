// Catalog of coin/chain combinations creators can accept crypto payments in.
// Each entry's `chainId` must match a chain enabled on the platform's own
// BoomFi settlement account (see /api/boomfi/settlement-chains, backed by
// GET /v1/accounts) — otherwise the deposit_split's platform-fee leg has
// nowhere to settle to. chainId values below confirmed against the live
// BoomFi account on 2026-07-21.
export type CryptoCoin = {
  key: string
  label: string
  ticker: string
  chainId: number
  chainLabel: string
}

export const CRYPTO_COINS: CryptoCoin[] = [
  { key: 'usdc-solana', label: 'USDC (Solana)', ticker: 'usdc', chainId: 1399811149, chainLabel: 'Solana' },
  { key: 'usdt-solana', label: 'USDT (Solana)', ticker: 'usdt', chainId: 1399811149, chainLabel: 'Solana' },
  { key: 'usdt-polygon', label: 'USDT (Polygon)', ticker: 'usdt', chainId: 137, chainLabel: 'Polygon' },
  { key: 'usdc-polygon', label: 'USDC (Polygon)', ticker: 'usdc', chainId: 137, chainLabel: 'Polygon' },
  { key: 'usdc-base', label: 'USDC (Base)', ticker: 'usdc', chainId: 8453, chainLabel: 'Base' },
  { key: 'usdt-bsc', label: 'USDT (BNB Smart Chain)', ticker: 'usdt', chainId: 56, chainLabel: 'BNB Smart Chain' },
  { key: 'usdc-bsc', label: 'USDC (BNB Smart Chain)', ticker: 'usdc', chainId: 56, chainLabel: 'BNB Smart Chain' },
  { key: 'usdc-arbitrum', label: 'USDC (Arbitrum)', ticker: 'usdc', chainId: 42161, chainLabel: 'Arbitrum' },
  { key: 'usdt-arbitrum', label: 'USDT (Arbitrum)', ticker: 'usdt', chainId: 42161, chainLabel: 'Arbitrum' },
]

export function getCoin(key: string): CryptoCoin | undefined {
  return CRYPTO_COINS.find(c => c.key === key)
}

// Catalog of chains + coins creators can accept crypto payments in, mirroring
// the BoomFi dashboard's "Crypto settlement" layout (one card per chain, with
// a currency checklist). Each `chainId` must match a chain enabled on the
// platform's own BoomFi settlement account (see /api/boomfi/settlement-chains,
// backed by GET /v1/accounts) — otherwise the platform has no matching
// settlement account for that chain. chainId values confirmed against the
// live BoomFi account on 2026-07-21.
export type CryptoChain = {
  chainId: number
  /** @web3icons/react network `id` — Solana has no EVM chainId, so icon lookup needs its own id */
  iconId: string
  label: string
  coins: Array<{ key: string; ticker: string }>
}

export const CRYPTO_CHAINS: CryptoChain[] = [
  {
    chainId: 137,
    iconId: 'polygon',
    label: 'Polygon',
    coins: [
      { key: 'usdc-polygon', ticker: 'USDC' },
      { key: 'usdt-polygon', ticker: 'USDT' },
    ],
  },
  {
    chainId: 42161,
    iconId: 'arbitrum-one',
    label: 'Arbitrum',
    coins: [
      { key: 'usdc-arbitrum', ticker: 'USDC' },
      { key: 'usdt-arbitrum', ticker: 'USDT' },
    ],
  },
  {
    chainId: 1399811149,
    iconId: 'solana',
    label: 'Solana',
    coins: [
      { key: 'usdc-solana', ticker: 'USDC' },
      { key: 'usdt-solana', ticker: 'USDT' },
    ],
  },
  {
    chainId: 56,
    iconId: 'binance-smart-chain',
    label: 'BNB Smart Chain',
    coins: [
      { key: 'usdc-bsc', ticker: 'USDC' },
      { key: 'usdt-bsc', ticker: 'USDT' },
    ],
  },
  {
    chainId: 8453,
    iconId: 'base',
    label: 'Base',
    coins: [{ key: 'usdc-base', ticker: 'USDC' }],
  },
]

export const CRYPTO_COINS = CRYPTO_CHAINS.flatMap(chain =>
  chain.coins.map(coin => ({
    key: coin.key,
    label: `${coin.ticker} (${chain.label})`,
    ticker: coin.ticker.toLowerCase(),
    chainId: chain.chainId,
    chainLabel: chain.label,
  })),
)

export function getCoin(key: string) {
  return CRYPTO_COINS.find(c => c.key === key)
}

// Catalog of EVM chains + stablecoins splitfy accepts, mirroring the coverage
// of apps/web's crypto-coins.ts. Unlike that catalog, this one carries the
// ERC-20 contract address + decimals for each token — required for viem
// reads/writes (allowance, balanceOf, transfer, transferFrom).
//
// Contract addresses below are the canonical, widely-referenced mainnet
// deployments (Circle's USDC, Tether's USDT) for each chain — verify against
// a block explorer before going live with real funds.

export type EvmToken = {
  /** Catalog key encoding token + chain, e.g. "usdc-polygon". */
  key: string
  ticker: 'USDC' | 'USDT'
  address: `0x${string}`
  decimals: number
}

export type EvmChain = {
  chainId: number
  label: string
  /** @web3icons/react network `id`, for UI reuse with apps/web's icon set. */
  iconId: string
  tokens: EvmToken[]
}

export const EVM_CHAINS: EvmChain[] = [
  {
    chainId: 137,
    label: 'Polygon',
    iconId: 'polygon',
    tokens: [
      { key: 'usdc-polygon', ticker: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      { key: 'usdt-polygon', ticker: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    ],
  },
  {
    chainId: 42161,
    label: 'Arbitrum',
    iconId: 'arbitrum-one',
    tokens: [
      { key: 'usdc-arbitrum', ticker: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { key: 'usdt-arbitrum', ticker: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ],
  },
  {
    chainId: 56,
    label: 'BNB Smart Chain',
    iconId: 'binance-smart-chain',
    tokens: [
      { key: 'usdc-bsc', ticker: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
      { key: 'usdt-bsc', ticker: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    ],
  },
  {
    chainId: 8453,
    label: 'Base',
    iconId: 'base',
    tokens: [{ key: 'usdc-base', ticker: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }],
  },
]

export const EVM_TOKENS = EVM_CHAINS.flatMap((chain) =>
  chain.tokens.map((token) => ({
    ...token,
    chainId: chain.chainId,
    chainLabel: chain.label,
  })),
)

export function getToken(tokenKey: string) {
  return EVM_TOKENS.find((t) => t.key === tokenKey)
}

export function getChain(chainId: number) {
  return EVM_CHAINS.find((c) => c.chainId === chainId)
}

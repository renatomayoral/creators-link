// Typed, validated access to environment variables. Throws early (at first
// access) if a required var is missing, so misconfiguration fails loudly
// instead of surfacing as a confusing runtime error deep in a request.

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  // Database (splitfy has its own DB, separate from apps/web for extraction).
  get databaseUrl() {
    return required('SPLITFY_DATABASE_URL')
  },

  // On-chain operator: hot signer that pulls funds and executes the split.
  get operatorPrivateKey() {
    return required('OPERATOR_PRIVATE_KEY')
  },

  // Where the platform take-rate lands when a merchant has no explicit wallet.
  get platformWalletAddress() {
    return required('PLATFORM_WALLET_ADDRESS')
  },

  // Per-chain RPC endpoints (fall back to public defaults in chains.ts if unset).
  rpcUrl(chainId: number): string | undefined {
    const byChain: Record<number, string> = {
      137: 'RPC_URL_POLYGON',
      42161: 'RPC_URL_ARBITRUM',
      8453: 'RPC_URL_BASE',
      56: 'RPC_URL_BSC',
      84532: 'RPC_URL_BASE_SEPOLIA',
    }
    const key = byChain[chainId]
    return key ? optional(key) : undefined
  },

  get cronSecret() {
    return required('CRON_SECRET')
  },

  // Public base URL of this splitfy deployment (used to build subscribe links).
  get appUrl() {
    return process.env['SPLITFY_APP_URL'] || 'http://localhost:3001'
  },

  // Better Auth (merchant dashboard — scaffold only in M1).
  get betterAuthSecret() {
    return optional('SPLITFY_BETTER_AUTH_SECRET') ?? optional('BETTER_AUTH_SECRET') ?? ''
  },
  get betterAuthUrl() {
    return process.env['SPLITFY_BETTER_AUTH_URL'] || this.appUrl
  },
}

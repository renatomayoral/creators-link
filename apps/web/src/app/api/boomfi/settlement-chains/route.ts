import { NextResponse } from 'next/server'
import { listSettlementAccounts } from '@/lib/boomfi'
import { CRYPTO_COINS } from '@/lib/crypto-coins'

// GET /api/boomfi/settlement-chains
// Returns the coin catalog filtered down to chains actually enabled on the
// platform's BoomFi settlement account — a creator can't accept a coin the
// platform itself has no matching settlement chain for.
export async function GET() {
  try {
    const accounts = await listSettlementAccounts()
    const enabledChainIds = new Set(accounts.filter(a => a.enabled).map(a => a.chainId))
    const coins = CRYPTO_COINS.filter(c => enabledChainIds.has(c.chainId))
    return NextResponse.json({ coins })
  } catch (err) {
    console.error('[boomfi/settlement-chains]', err)
    // Fall back to the full static catalog if the BoomFi API is unreachable —
    // better to let setup proceed than block on a transient error.
    return NextResponse.json({ coins: CRYPTO_COINS })
  }
}

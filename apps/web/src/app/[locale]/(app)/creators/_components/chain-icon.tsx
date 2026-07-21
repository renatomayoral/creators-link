'use client'

import { NetworkIcon } from '@web3icons/react/dynamic'

export function ChainIcon({ iconId, className }: { iconId: string; className?: string }) {
  return <NetworkIcon id={iconId} variant="branded" className={className} fallback={null} />
}

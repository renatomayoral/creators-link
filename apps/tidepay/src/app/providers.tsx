'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { arbitrum, base, bsc, polygon } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const walletConnectProjectId = process.env['NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID']

const wagmiConfig = createConfig({
  chains: [polygon, arbitrum, bsc, base],
  connectors: [injected(), ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : [])],
  transports: {
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [base.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

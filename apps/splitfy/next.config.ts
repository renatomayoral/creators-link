import { config } from 'dotenv'
import path from 'path'
import type { NextConfig } from 'next'

// splitfy is designed to be extracted into its own repo later, so it keeps its
// own config and does NOT depend on any @repo/* business package. It still
// reads the shared root .env during monorepo development.
config({ path: path.resolve(__dirname, '../../.env') })

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig

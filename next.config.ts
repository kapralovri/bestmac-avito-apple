import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [],
  },
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

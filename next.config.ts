import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

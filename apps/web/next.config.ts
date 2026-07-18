import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    '@cuweave/db',
    '@cuweave/domain',
    '@cuweave/requirements',
  ],
}

export default nextConfig

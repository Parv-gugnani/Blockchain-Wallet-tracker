/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['etherscan.io']
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/wallet',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
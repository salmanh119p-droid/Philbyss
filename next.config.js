/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['googleapis'],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },

  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'sonner',
      'recharts'
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  compress: true,
}

module.exports = nextConfig
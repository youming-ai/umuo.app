/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: ["localhost", "umuo.app", "umuo.pages.dev"],
  },

  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-icons",
      "lucide-react",
      "sonner",
      "recharts",
      "@tanstack/react-query",
    ],
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Cloudflare Pages optimization
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
              )[1];
              return `npm.${packageName.replace("@", "")}`;
            },
            priority: -10,
            chunks: "all",
          },
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: "ui-components",
            priority: -15,
            chunks: "all",
          },
        },
      };
    }

    return config;
  },

  compress: true,

  // Performance optimizations
  poweredByHeader: false,

  // Security headers
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
    {
      source: "/api/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, must-revalidate",
        },
      ],
    },
  ],

  // Cloudflare Pages compatible output
  distDir: ".next",

  // Ensure proper output for Cloudflare Pages
  output: undefined,
};

module.exports = nextConfig;

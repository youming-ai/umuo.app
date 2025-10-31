/** @type {import('next').NextConfig} */

const nextConfig = {
  // 图片优化配置 - Vercel 支持完整的图片优化
  images: {
    domains: ["localhost", "umuo.app", "vercel.app"],
    formats: ["image/webp", "image/avif"],
  },

  // 环境变量配置
  env: {
    NEXT_PUBLIC_DEPLOYMENT_PLATFORM: "vercel",
  },

  // 压缩和性能
  compress: true,
  poweredByHeader: false,

  // 重定向配置
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // 头部配置
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
    {
      source: "/_next/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

// 分析模式
if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

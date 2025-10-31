/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基础配置
  outputFileTracingRoot: __dirname,

  // 图片优化配置
  images: {
    domains: ["localhost", "umuo.app", "umuo.pages.dev"],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 服务器外部包
  serverExternalPackages: ["sharp"],

  // 环境变量
  env: {
    NEXT_PUBLIC_DEPLOYMENT_PLATFORM: "cloudflare-workers",
  },

  // 压缩
  compress: true,

  // 重定向
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // 重写规则
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: "/api/health/route",
      },
    ];
  },

  // 头部设置
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // TypeScript 配置
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.json",
  },

  // ESLint 配置
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 严格模式
  reactStrictMode: null, // 使用 React 19 默认值
};

// 根据环境设置特定配置
if (process.env.NODE_ENV === "production") {
  // 生产环境特定配置
  nextConfig.poweredByHeader = false;
  nextConfig.generateEtags = true;
}

// 分析模式
if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

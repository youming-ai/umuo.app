/** @type {import('next').NextConfig} */
const nextConfig = {
  // 修复 Next.js 工作目录警告
  outputFileTracingRoot: __dirname,
  // 图片优化配置 - OpenNext.js 支持完整的图片优化
  images: {
    domains: ["localhost", "umuo.app", "umuo.pages.dev"],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 实验性功能 - 简化以避免兼容性问题
  experimental: {
    // 暂时禁用包优化以排除构建问题
    // optimizePackageImports: [
    //   "@radix-ui/react-icons",
    //   "lucide-react",
    //   "sonner",
    //   "@tanstack/react-query",
    // ],
  },

  // 服务器组件外部包配置
  serverExternalPackages: ["sharp"],

  // 输出配置 - 回到标准模式
  output: undefined, // 标准构建模式

  // 压缩和性能
  compress: true,
  poweredByHeader: false,

  // 环境变量配置
  env: {
    NEXT_PUBLIC_DEPLOYMENT_PLATFORM: "cloudflare-workers",
  },

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

  // 重写配置 - 用于 API 路由优化
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/health",
          destination: "/api/health/route",
        },
      ],
    };
  },

  // Webpack 配置优化
  webpack: (config, { isServer, webpack }) => {
    // 为服务器端添加 polyfill - 解决 self 未定义问题
    if (isServer) {
      // 增强的后处理方法 - 修复 vendors.js 和 webpack-runtime.js
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.afterEmit.tapAsync(
            "FixVendorsPlugin",
            (_compilation, callback) => {
              const fs = require("node:fs");

              // 修复所有 vendors-* 文件的 self 问题
              try {
                const serverDir = ".next/server";
                if (fs.existsSync(serverDir)) {
                  const files = fs.readdirSync(serverDir);
                  const polyfill = `
                    // 修复 self 未定义错误
                    if (typeof self === 'undefined') {
                      self = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this);
                    }
                    if (typeof webpackChunk_N_E === 'undefined') {
                      var webpackChunk_N_E = self.webpackChunk_N_E || [];
                    }
                  `;

                  for (const file of files) {
                    if (file.startsWith("vendors-") && file.endsWith(".js")) {
                      const filePath = `${serverDir}/${file}`;
                      let content = fs.readFileSync(filePath, "utf8");
                      content = polyfill + content;
                      fs.writeFileSync(filePath, content);
                      console.log(`✅ Fixed ${file} self polyfill`);
                    }
                  }
                }
              } catch (error) {
                console.error("Error fixing vendor files:", error);
              }

              // 暂时跳过 webpack-runtime.js 修改以避免语法错误
              console.log(
                "⚠️ Skipping webpack-runtime.js modifications to prevent syntax errors",
              );

              callback();
            },
          );
        },
      });

      // 修复 AI SDK 和 Groq SDK 的兼容性问题
      config.resolve.alias = {
        ...config.resolve.alias,
        // 确保在服务器环境中正确引用
        undici: false,
      };
    }

    // Cloudflare Workers 环境优化
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      // 客户端 polyfill
      config.plugins.push(
        new webpack.DefinePlugin({
          self: "typeof window !== 'undefined' ? window : globalThis",
        }),
      );
    }

    // 完全禁用 chunk 分割以避免模块加载问题
    config.optimization.splitChunks = false;

    // 解决 AI SDK 的兼容性问题
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        undici: "commonjs undici",
      });
    }

    return config;
  },

  // 安全头部配置
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
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
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
        {
          key: "Access-Control-Allow-Origin",
          value: "*",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, Authorization",
        },
      ],
    },
    {
      // 静态资源缓存
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

module.exports = nextConfig;

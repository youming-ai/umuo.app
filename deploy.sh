#!/bin/bash

# Cloudflare Pages 部署脚本
# 使用方法: ./deploy.sh [production|preview]

set -e

ENVIRONMENT=${1:-preview}
echo "🚀 开始部署到 Cloudflare Pages ($ENVIRONMENT 环境)..."

# 检查依赖
echo "📦 检查依赖..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

if ! command -v wrangler &> /dev/null; then
    echo "📥 安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 安装项目依赖
echo "📦 安装项目依赖..."
npm ci

# 运行测试
echo "🧪 运行测试..."
npm run test

# 构建项目
echo "🔨 构建项目..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build
else
    npm run build
fi

# 部署到 Cloudflare Pages
echo "☁️ 部署到 Cloudflare Pages..."
if [ "$ENVIRONMENT" = "production" ]; then
    wrangler pages deploy .next --project-name shadowing-learning --compatibility-date 2024-01-01
else
    wrangler pages deploy .next --project-name shadowing-learning --compatibility-date 2024-01-01 --env preview
fi

echo "✅ 部署完成!"
echo "🌐 应用已部署到: https://shadowing-learning.pages.dev"

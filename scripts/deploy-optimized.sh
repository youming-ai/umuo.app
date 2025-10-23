#!/bin/bash

# ===================================================================
# Cloudflare Pages 优化部署脚本
# 用于 umuo.app 项目的本地部署
# ===================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}🔧 $1${NC}"
}

# 检查依赖
check_dependencies() {
    log_step "检查依赖..."

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请先安装 pnpm"
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        log_error "npx 未安装，请先安装 Node.js"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 清理构建缓存
clean_build() {
    log_step "清理构建缓存..."

    if [ -d ".next" ]; then
        rm -rf .next
        log_success "已删除 .next 目录"
    fi

    if [ -d "out" ]; then
        rm -rf out
        log_success "已删除 out 目录"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "安装依赖..."

    pnpm install --frozen-lockfile
    log_success "依赖安装完成"
}

# 构建应用
build_application() {
    log_step "构建应用..."

    pnpm build
    log_success "应用构建完成"
}

# 优化构建文件
optimize_build() {
    log_step "优化构建文件..."

    echo "构建目录大小（优化前）:"
    du -sh .next 2>/dev/null || echo "无法获取大小"

    # 复制服务端渲染的HTML文件
    log_info "复制服务端渲染文件..."
    if [ -d ".next/server/app" ]; then
        cp -r .next/server/app/* .next/
        log_success "已复制服务端渲染文件"
    else
        log_warning "未找到服务端渲染文件"
    fi

    # 创建正确的静态资源结构
    log_info "设置静态资源结构..."
    mkdir -p .next/_next/static
    if [ -d ".next/static" ]; then
        cp -r .next/static/* .next/_next/
        log_success "已设置静态资源结构"
    fi

    # 确保静态资源在两个位置都存在
    if [ -d ".next/_next/css" ]; then
        mkdir -p .next/_next/static
        cp -r .next/_next/css .next/_next/static/
        cp -r .next/_next/chunks .next/_next/static/ 2>/dev/null || true
        log_success "已创建完整的静态资源结构"
    fi

    # 复制公共文件
    log_info "复制公共文件..."
    if [ -d "public" ]; then
        cp -r public/* .next/ 2>/dev/null || true
        log_success "已复制公共文件"
    fi

    # 删除大文件
    log_info "删除大缓存文件..."
    find .next -name "*.pack" -size +20M -delete 2>/dev/null || true
    find .next -name "*.map" -size +5M -delete 2>/dev/null || true
    rm -rf .next/cache 2>/dev/null || true
    rm -f .next/trace 2>/dev/null || true

    # 删除开发文件
    find .next -name "*.hot-update.js" -delete 2>/dev/null || true
    find .next -name "*.hot-update.json" -delete 2>/dev/null || true

    echo "构建目录大小（优化后）:"
    du -sh .next 2>/dev/null || echo "无法获取大小"

    log_success "构建优化完成"
}

# 部署到 Cloudflare Pages
deploy_to_cloudflare() {
    log_step "部署到 Cloudflare Pages..."

    local project_name="umuo-app"

    # 检查是否登录 Cloudflare
    if ! npx wrangler whoami &> /dev/null; then
        log_warning "未登录 Cloudflare，正在尝试登录..."
        npx wrangler login
    fi

    # 部署
    log_info "正在部署到项目: $project_name"
    npx wrangler pages deploy .next --project-name "$project_name" --commit-dirty=true

    log_success "部署完成！"
}

# 设置环境变量
setup_environment() {
    log_step "设置环境变量..."

    # 设置基本环境变量
    echo "production" | npx wrangler pages secret put NODE_ENV --project-name umuo-app
    echo "https://umuo-app.pages.dev" | npx wrangler pages secret put NEXT_PUBLIC_APP_URL --project-name umuo-app
    echo "180000" | npx wrangler pages secret put TRANSCRIPTION_TIMEOUT_MS --project-name umuo-app
    echo "2" | npx wrangler pages secret put TRANSCRIPTION_RETRY_COUNT --project-name umuo-app
    echo "2" | npx wrangler pages secret put TRANSCRIPTION_MAX_CONCURRENCY --project-name umuo-app

    log_success "基本环境变量设置完成"
    log_warning "请手动设置 GROQ_API_KEY 以启用音频转录功能"
}

# 验证部署
verify_deployment() {
    log_step "验证部署..."

    local deployment_url="https://umuo-app.pages.dev"

    # 检查主页面
    log_info "检查主页面..."
    if curl -s -o /dev/null -w "%{http_code}" "$deployment_url" | grep -q "200"; then
        log_success "主页面访问正常"
    else
        log_error "主页面访问失败"
        return 1
    fi

    # 检查静态资源
    log_info "检查静态资源..."
    if curl -s -o /dev/null -w "%{http_code}" "$deployment_url/_next/static/css/62ec34a62cd53a0e.css" | grep -q "200"; then
        log_success "CSS 文件访问正常"
    else
        log_error "CSS 文件访问失败"
        return 1
    fi

    log_success "部署验证完成"
    echo "🌐 应用已部署到: $deployment_url"
}

# 显示帮助信息
show_help() {
    cat << EOF
Cloudflare Pages 优化部署脚本

用法: $0 [选项]

选项:
    -h, --help          显示帮助信息
    -c, --clean         仅清理构建缓存
    -b, --build         仅构建应用
    -o, --optimize      仅优化构建文件
    -d, --deploy        仅部署应用
    -e, --env           仅设置环境变量
    -v, --verify        仅验证部署
    --no-clean          跳过缓存清理
    --no-env            跳过环境变量设置
    --no-verify         跳过部署验证

示例:
    $0                  完整部署流程
    $0 --clean          清理缓存
    $0 --build          仅构建
    $0 --deploy         仅部署
    $0 --no-clean       跳过缓存清理的完整部署
EOF
}

# 主函数
main() {
    local clean=true
    local build=true
    local optimize=true
    local deploy=true
    local env=true
    local verify=true

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean=true
                build=false
                optimize=false
                deploy=false
                env=false
                verify=false
                shift
                ;;
            -b|--build)
                clean=false
                build=true
                optimize=false
                deploy=false
                env=false
                verify=false
                shift
                ;;
            -o|--optimize)
                clean=false
                build=false
                optimize=true
                deploy=false
                env=false
                verify=false
                shift
                ;;
            -d|--deploy)
                clean=false
                build=false
                optimize=false
                deploy=true
                env=false
                verify=false
                shift
                ;;
            -e|--env)
                clean=false
                build=false
                optimize=false
                deploy=false
                env=true
                verify=false
                shift
                ;;
            -v|--verify)
                clean=false
                build=false
                optimize=false
                deploy=false
                env=false
                verify=true
                shift
                ;;
            --no-clean)
                clean=false
                shift
                ;;
            --no-env)
                env=false
                shift
                ;;
            --no-verify)
                verify=false
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 显示开始信息
    echo "=============================================="
    echo "🚀 Cloudflare Pages 优化部署脚本"
    echo "=============================================="

    # 执行部署流程
    if [ "$clean" = true ]; then
        check_dependencies
        clean_build
    fi

    if [ "$build" = true ]; then
        check_dependencies
        install_dependencies
        build_application
    fi

    if [ "$optimize" = true ]; then
        optimize_build
    fi

    if [ "$deploy" = true ]; then
        deploy_to_cloudflare
    fi

    if [ "$env" = true ]; then
        setup_environment
    fi

    if [ "$verify" = true ]; then
        verify_deployment
    fi

    echo "=============================================="
    log_success "部署流程完成！"
    echo "=============================================="
}

# 脚本入口
main "$@"

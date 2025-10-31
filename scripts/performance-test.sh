#!/bin/bash

# 性能测试脚本
# 使用 Lighthouse 和自定义指标测试应用性能

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_URL=${1:-"http://localhost:3000"}
OUTPUT_DIR="$PROJECT_ROOT/performance-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

log_info "开始性能测试"
log_info "测试URL: $TEST_URL"
log_info "输出目录: $OUTPUT_DIR"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查 Lighthouse CLI
    if ! command -v lighthouse &> /dev/null; then
        log_info "安装 Lighthouse CLI..."
        npm install -g lighthouse
    fi

    # 检查应用是否运行
    if ! curl -s "$TEST_URL" > /dev/null; then
        log_error "应用未运行在 $TEST_URL"
        log_info "请先运行: pnpm dev"
        exit 1
    fi

    log_success "依赖检查完成"
}

# Lighthouse 性能测试
run_lighthouse_test() {
    log_info "运行 Lighthouse 性能测试..."

    local lighthouse_output="$OUTPUT_DIR/lighthouse-$TIMESTAMP.json"
    local lighthouse_html="$OUTPUT_DIR/lighthouse-$TIMESTAMP.html"

    lighthouse "$TEST_URL" \
        --output=json \
        --output=html \
        --output-path="$OUTPUT_DIR/lighthouse-$TIMESTAMP" \
        --chrome-flags="--headless" \
        --quiet

    # 提取关键指标
    local performance_score=$(cat "$lighthouse_output" | jq -r '.lhr.categories.performance.score * 100')
    local fcp=$(cat "$lighthouse_output" | jq -r '.lhr.audits["first-contentful-paint"].numericValue')
    local lcp=$(cat "$lighthouse_output" | jq -r '.lhr.audits["largest-contentful-paint"].numericValue')
    local fid=$(cat "$lighthouse_output" | jq -r '.lhr.audits["max-potential-fid"].numericValue')
    local cls=$(cat "$lighthouse_output" | jq -r '.lhr.audits["cumulative-layout-shift"].numericValue')

    log_success "Lighthouse 测试完成"
    log_info "性能评分: ${performance_score:-N/A}"
    log_info "FCP: ${fcp:-N/A}ms"
    log_info "LCP: ${lcp:-N/A}ms"
    log_info "FID: ${fid:-N/A}ms"
    log_info "CLS: ${cls:-N/A}"

    # 保存关键指标
    cat > "$OUTPUT_DIR/metrics-$TIMESTAMP.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "url": "$TEST_URL",
  "lighthouse": {
    "performanceScore": $performance_score,
    "firstContentfulPaint": $fcp,
    "largestContentfulPaint": $lcp,
    "firstInputDelay": $fid,
    "cumulativeLayoutShift": $cls
  }
}
EOF
}

# API 性能测试
test_api_performance() {
    log_info "测试 API 性能..."

    # 测试健康检查接口
    local health_response_time=$(curl -o /dev/null -s -w '%{time_total}' "$TEST_URL/api/health")
    log_info "健康检查响应时间: ${health_response_time}s"

    # 测试多个 API 接口
    local api_endpoints=(
        "/api/health"
        "/api/progress/123"
    )

    local api_results="$OUTPUT_DIR/api-performance-$TIMESTAMP.json"
    echo "[" > "$api_results"

    for i in "${!api_endpoints[@]}"; do
        local endpoint="${api_endpoints[$i]}"
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$TEST_URL$endpoint")
        local http_code=$(curl -o /dev/null -s -w '%{http_code}' "$TEST_URL$endpoint")

        local result=$(cat << EOF
{
  "endpoint": "$endpoint",
  "responseTime": $response_time,
  "httpCode": $http_code,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        )

        if [ $i -gt 0 ]; then
            echo "," >> "$api_results"
        fi
        echo "$result" >> "$api_results"

        log_info "API $endpoint: ${response_time}s (HTTP $http_code)"
    done

    echo "]" >> "$api_results"
    log_success "API 性能测试完成"
}

# 资源加载测试
test_resource_loading() {
    log_info "测试资源加载性能..."

    # 使用 curl 测试关键资源
    local resources=(
        "$TEST_URL/"
        "$TEST_URL/_next/static/css/app.css"
        "$TEST_URL/_next/static/js/app.js"
    )

    local resource_results="$OUTPUT_DIR/resource-loading-$TIMESTAMP.json"
    echo "[" > "$resource_results"

    for i in "${!resources[@]}"; do
        local resource="${resources[$i]}"
        local start_time=$(date +%s%N)
        local http_code=$(curl -o /dev/null -s -w '%{http_code}' "$resource")
        local end_time=$(date +%s%N)
        local load_time=$((($end_time - $start_time) / 1000000)) # 转换为毫秒

        local result=$(cat << EOF
{
  "url": "$resource",
  "loadTime": $load_time,
  "httpCode": $http_code,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        )

        if [ $i -gt 0 ]; then
            echo "," >> "$resource_results"
        fi
        echo "$result" >> "$resource_results"

        log_info "资源 $(basename "$resource"): ${load_time}ms"
    done

    echo "]" >> "$resource_results"
    log_success "资源加载测试完成"
}

# 内存使用测试
test_memory_usage() {
    log_info "测试内存使用情况..."

    # 如果应用正在本地运行，尝试获取内存信息
    if [[ "$TEST_URL" == *"localhost"* ]]; then
        # 这里可以添加获取 Node.js 进程内存的逻辑
        log_info "本地应用内存监控需要额外的进程信息"
    fi

    # 创建内存报告模板
    cat > "$OUTPUT_DIR/memory-usage-$TIMESTAMP.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "testUrl": "$TEST_URL",
  "note": "内存使用测试需要服务器端监控集成"
}
EOF

    log_success "内存使用测试完成"
}

# 生成综合报告
generate_report() {
    log_info "生成综合性能报告..."

    local report_file="$OUTPUT_DIR/performance-report-$TIMESTAMP.md"

    cat > "$report_file" << EOF
# umuo.app 性能测试报告

**测试时间**: $(date)
**测试URL**: $TEST_URL
**测试环境**: $(uname -s) $(uname -r)

## Lighthouse 性能评分

$(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.categories.performance.score * 100') / 100

### 核心Web指标

| 指标 | 数值 | 评分 |
|------|------|------|
| First Contentful Paint (FCP) | $(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.audits["first-contentful-paint"].displayValue') | - |
| Largest Contentful Paint (LCP) | $(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.audits["largest-contentful-paint"].displayValue') | - |
| First Input Delay (FID) | $(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.audits["max-potential-fid"].displayValue') | - |
| Cumulative Layout Shift (CLS) | $(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.audits["cumulative-layout-shift"].displayValue') | - |

## API 性能测试

详细的 API 性能数据请参考 \`api-performance-$TIMESTAMP.json\`

## 资源加载性能

详细的资源加载数据请参考 \`resource-loading-$TIMESTAMP.json\`

## 优化建议

基于 Lighthouse 测试结果的主要优化建议：

$(cat "$OUTPUT_DIR/lighthouse-$TIMESTAMP.json" | jq -r '.lhr.audits | to_entries[] | select(.value.score < 0.9) | "- " + (.value.title | gsub("<"; "<") | gsub(">"; ">")) + ": " + (.value.description | gsub("<"; "<") | gsub(">"; ">")) + "\n"')

## 下一步行动

1. **立即处理**: 修复评分低于 90 的项目
2. **持续监控**: 设置性能监控告警
3. **定期测试**: 每周运行一次性能测试
4. **优化迭代**: 根据用户反馈持续优化

---

*报告生成时间: $(date)*
*详细数据: 请查看 $OUTPUT_DIR 目录下的 JSON 文件*
EOF

    log_success "综合报告已生成: $report_file"
}

# 主函数
main() {
    log_info "开始 umuo.app 性能测试套件"

    check_dependencies
    run_lighthouse_test
    test_api_performance
    test_resource_loading
    test_memory_usage
    generate_report

    log_success "性能测试完成！"
    echo
    echo "📊 测试结果:"
    echo "  - Lighthouse 报告: $OUTPUT_DIR/lighthouse-$TIMESTAMP.html"
    echo "  - 综合报告: $OUTPUT_DIR/performance-report-$TIMESTAMP.md"
    echo "  - 详细数据: $OUTPUT_DIR/"
    echo
    echo "🔗 建议下一步:"
    echo "  1. 查看 HTML 报告了解详细性能问题"
    echo "  2. 根据建议进行性能优化"
    echo "  3. 设置定期性能监控"
}

# 执行主函数
main "$@"

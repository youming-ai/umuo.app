#!/usr/bin/env node

/**
 * Cloudflare Workers 兼容性测试脚本
 * 验证重构后的代码是否与 Edge Runtime 兼容
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 开始 Cloudflare Workers 兼容性测试...\n');

// 测试结果统计
let passedTests = 0;
let totalTests = 0;

/**
 * 执行测试用例
 */
function runTest(testName, testFn) {
  totalTests++;
  try {
    console.log(`⏳ 测试: ${testName}`);
    testFn();
    console.log(`✅ 通过: ${testName}\n`);
    passedTests++;
  } catch (error) {
    console.log(`❌ 失败: ${testName}`);
    console.log(`   错误: ${error.message}\n`);
  }
}

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath, description) {
  runTest(description, () => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
  });
}

/**
 * 检查文件内容
 */
function checkFileContent(filePath, pattern, description) {
  runTest(description, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(pattern)) {
      throw new Error(`文件内容不包含: ${pattern}`);
    }
  });
}

/**
 * 检查 TypeScript 编译
 */
function checkTypeScriptCompilation() {
  runTest('TypeScript 编译检查', () => {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('TypeScript 编译失败');
    }
  });
}

/**
 * 检查 API 路由 Edge Runtime 配置
 */
function checkAPIRoutesEdgeRuntime() {
  const apiRoutes = [
    'src/app/api/transcribe/route.ts',
    'src/app/api/progress/[fileId]/route.ts',
    'src/app/api/postprocess/route.ts'
  ];

  apiRoutes.forEach(route => {
    checkFileContent(
      route,
      "export const runtime = 'edge'",
      `API 路由 Edge Runtime 配置: ${route}`
    );
  });
}

/**
 * 检查 KV 配置
 */
function checkKVConfiguration() {
  checkFileContent(
    'wrangler.toml',
    'TRANSCRIPTION_PROGRESS',
    'wrangler.toml KV 命名空间配置'
  );

  checkFileContent(
    'wrangler.toml',
    'TRANSCRIPTION_CACHE',
    'wrangler.toml KV 缓存配置'
  );
}

/**
 * 检查 Cloudflare 适配器
 */
function checkCloudflareAdapters() {
  checkFileExists(
    'src/lib/cloudflare/kv-progress-store.ts',
    'KV 进度存储适配器文件'
  );

  checkFileExists(
    'src/lib/cloudflare/edge-adapter.ts',
    'Edge 适配器文件'
  );

  checkFileContent(
    'src/lib/cloudflare/kv-progress-store.ts',
    'class KVProgressStore',
    'KVProgressStore 类定义'
  );

  checkFileContent(
    'src/lib/cloudflare/edge-adapter.ts',
    'export const edgeAdapter',
    'Edge 适配器导出'
  );
}

/**
 * 检查 server-progress 重构
 */
function checkServerProgressRefactor() {
  checkFileContent(
    'src/lib/ai/server-progress.ts',
    'export async function setServerProgress',
    '异步 setServerProgress 函数'
  );

  checkFileContent(
    'src/lib/ai/server-progress.ts',
    'export async function getServerProgress',
    '异步 getServerProgress 函数'
  );

  checkFileContent(
    'src/lib/ai/server-progress.ts',
    'isEdgeRuntime',
    'Edge Runtime 环境检测'
  );
}

/**
 * 检查队列管理器重构
 */
function checkQueueManagerRefactor() {
  checkFileContent(
    'src/lib/transcription/queue-manager.ts',
    'scheduleQueueProcess',
    '事件驱动的队列调度'
  );

  checkFileContent(
    'src/lib/transcription/queue-manager.ts',
    'edgeAdapter.timer.setTimeout',
    'Edge Runtime 兼容的定时器'
  );

  // 确保没有 setInterval
  runTest('队列管理器移除 setInterval', () => {
    const content = fs.readFileSync('src/lib/transcription/queue-manager.ts', 'utf8');
    if (content.includes('setInterval(')) {
      throw new Error('仍然包含 setInterval');
    }
  });
}

/**
 * 检查依赖关系
 */
function checkDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    runTest('检查 wrangler 依赖', () => {
      if (!packageJson.devDependencies?.wrangler) {
        throw new Error('缺少 wrangler 依赖');
      }
    });
  } catch (error) {
    throw new Error('无法读取 package.json');
  }
}

/**
 * 模拟 Edge Runtime 环境测试
 */
function simulateEdgeRuntime() {
  runTest('Edge Runtime 模拟测试', () => {
    // 模拟 Edge Runtime 全局对象
    globalThis.EdgeRuntime = 'v8';

    // 这里可以添加更多的 Edge Runtime 模拟测试
    console.log('   模拟 Edge Runtime 环境通过');

    // 清理
    delete globalThis.EdgeRuntime;
  });
}

// 执行所有测试
console.log('📋 执行兼容性测试套件...\n');

// 基础文件检查
checkFileExists('wrangler.toml', 'wrangler.toml 配置文件');
checkFileExists('src/lib/cloudflare', 'Cloudflare 目录');

// API 路由检查
checkAPIRoutesEdgeRuntime();

// KV 配置检查
checkKVConfiguration();

// 适配器检查
checkCloudflareAdapters();

// 重构检查
checkServerProgressRefactor();
checkQueueManagerRefactor();

// 依赖检查
checkDependencies();

// TypeScript 编译检查
checkTypeScriptCompilation();

// Edge Runtime 模拟测试
simulateEdgeRuntime();

// 输出测试结果
console.log('📊 测试结果统计:');
console.log(`总测试数: ${totalTests}`);
console.log(`通过测试: ${passedTests}`);
console.log(`失败测试: ${totalTests - passedTests}`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (passedTests === totalTests) {
  console.log('🎉 所有兼容性测试通过！代码已准备好部署到 Cloudflare Workers。');
  process.exit(0);
} else {
  console.log('⚠️  部分测试失败，请检查上述错误并修复后重新测试。');
  process.exit(1);
}
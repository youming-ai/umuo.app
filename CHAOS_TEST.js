/**
 * 混沌测试脚本
 * 验证AI语言学习应用系统在故障情况下的表现
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('chaos_errors');

export let options = {
  stages: [
    { duration: '1m', target: 20 },    // 正常负载
    { duration: '2m', target: 20 },    // 注入故障期间
    { duration: '1m', target: 0 },     // 恢复阶段
  ],
  thresholds: {
    http_req_failed: ['rate<0.3'],     // 允许30%错误率 (故障期间)
    http_req_duration: ['p(95)<2000'], // 95%请求 < 2s
  },
};

const BASE_URL = 'http://localhost:3000';

// 混沌测试场景
const CHAOS_SCENARIOS = {
  NETWORK_LATENCY: 'network_latency',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  DATABASE_ERROR: 'database_error',
  MEMORY_PRESSURE: 'memory_pressure',
  TIMEOUT: 'timeout',
};

let currentScenario = CHAOS_SCENARIOS.NETWORK_LATENCY;

export default function () {
  // 根据不同场景进行测试
  switch (currentScenario) {
    case CHAOS_SCENARIOS.NETWORK_LATENCY:
      testNetworkLatency();
      break;
    case CHAOS_SCENARIOS.NETWORK_ERROR:
      testNetworkError();
      break;
    case CHAOS_SCENARIOS.SERVER_ERROR:
      testServerError();
      break;
    case CHAOS_SCENARIOS.DATABASE_ERROR:
      testDatabaseError();
      break;
    case CHAOS_SCENARIOS.MEMORY_PRESSURE:
      testMemoryPressure();
      break;
    case CHAOS_SCENARIOS.TIMEOUT:
      testTimeout();
      break;
    default:
      testNormalOperation();
  }

  // 切换到下一个故障场景
  const scenarios = Object.values(CHAOS_SCENARIOS);
  const currentIndex = scenarios.indexOf(currentScenario);
  currentScenario = scenarios[(currentIndex + 1) % scenarios.length];

  sleep(2);
}

// 测试正常操作 (基准)
function testNormalOperation() {
  console.log('测试: 正常操作');

  let response = http.get(`${BASE_URL}/api/health`, {
    timeout: '5s',
  });

  check(response, {
    'health check normal status': (r) => r.status === 200,
    'health check normal response time': (r) => r.timings.duration < 500,
  });
}

// 测试网络延迟
function testNetworkLatency() {
  console.log('混沌测试: 网络延迟');

  let response = http.get(`${BASE_URL}/api/health`, {
    timeout: '10s',  // 增加超时时间
    headers: {
      'X-Chaos-Test': 'network-latency',
      'X-Simulated-Latency': '2000ms',  // 模拟2秒延迟
    },
  });

  check(response, {
    'health check handles latency': (r) => r.status === 200 || r.status === 504,
    'health check response with latency': (r) => r.timings.duration < 10000,
    'graceful degradation under latency': (r) =>
      r.status === 504 ? r.body.includes('Service temporarily unavailable') : true,
  }) || errorRate.add(1);
}

// 测试网络错误
function testNetworkError() {
  console.log('混沌测试: 网络错误');

  let response = http.get(`${BASE_URL}/api/health`, {
    timeout: '5s',
    headers: {
      'X-Chaos-Test': 'network-error',
      'X-Simulate-Error': 'connection-refused',
    },
  });

  check(response, {
    'health check handles network error': (r) =>
      r.status === 0 || r.status === 503 || r.status === 502,
    'appropriate error handling': (r) => {
      if (r.status === 0) return true; // 连接失败是预期的
      if (r.status >= 500) return true; // 服务器错误也是预期的
      return false;
    },
  }) || errorRate.add(1);
}

// 测试服务器错误
function testServerError() {
  console.log('混沌测试: 服务器错误');

  let response = http.get(`${BASE_URL}/api/test-error`, {
    timeout: '5s',
    headers: {
      'X-Chaos-Test': 'server-error',
      'X-Simulate-Error': 'internal-server-error',
    },
  });

  check(response, {
    'server error properly handled': (r) => r.status >= 500,
    'error response format': (r) => {
      if (r.status >= 500) {
        try {
          const body = JSON.parse(r.body);
          return body.error || body.message;
        } catch {
          return false;
        }
      }
      return true;
    },
    'no data leakage in error': (r) => {
      if (r.status >= 500) {
        const body = r.body;
        return !body.includes('stack trace') &&
               !body.includes('internal path') &&
               !body.includes('database');
      }
      return true;
    },
  }) || errorRate.add(1);
}

// 测试数据库错误
function testDatabaseError() {
  console.log('混沌测试: 数据库错误');

  let response = http.get(`${BASE_URL}/api/files`, {
    timeout: '5s',
    headers: {
      'X-Chaos-Test': 'database-error',
      'X-Simulate-Error': 'database-connection-failed',
    },
  });

  check(response, {
    'database error handled gracefully': (r) =>
      r.status === 503 || r.status === 500,
    'appropriate database error message': (r) => {
      if (r.status === 503) {
        return r.body.includes('Service unavailable') ||
               r.body.includes('Database connection');
      }
      return true;
    },
    'no sensitive database info leaked': (r) => {
      const body = r.body.toLowerCase();
      return !body.includes('password') &&
             !body.includes('username') &&
             !body.includes('connection string');
    },
  }) || errorRate.add(1);
}

// 测试内存压力
function testMemoryPressure() {
  console.log('混沌测试: 内存压力');

  // 发送大文件请求来增加内存压力
  let response = http.post(`${BASE_URL}/api/large-data`, JSON.stringify({
    data: 'x'.repeat(1000000), // 1MB数据
    iterations: 100
  }), {
    timeout: '10s',
    headers: {
      'Content-Type': 'application/json',
      'X-Chaos-Test': 'memory-pressure',
    },
  });

  check(response, {
    'memory pressure handled': (r) =>
      r.status === 200 || r.status === 503 || r.status === 429,
    'graceful degradation': (r) => {
      if (r.status === 503 || r.status === 429) {
        return r.body.includes('overloaded') ||
               r.body.includes('try again later');
      }
      return true;
    },
  }) || errorRate.add(1);
}

// 测试超时
function testTimeout() {
  console.log('混沌测试: 超时处理');

  let response = http.get(`${BASE_URL}/api/slow-endpoint`, {
    timeout: '3s',  // 短超时时间
    headers: {
      'X-Chaos-Test': 'timeout',
      'X-Simulate-Delay': '5000ms',  // 模拟5秒处理时间
    },
  });

  check(response, {
    'timeout handled correctly': (r) =>
      r.status === 0 || r.status === 504 || r.status === 408,
    'no hanging requests': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);
}

// 恢复测试
export function recoveryTest() {
  console.log('恢复测试: 验证系统故障后能否正常恢复');

  // 先发送正常请求
  let normalResponse = http.get(`${BASE_URL}/api/health`, {
    timeout: '5s',
  });

  // 发送故障请求
  http.get(`${BASE_URL}/api/test-error`, {
    headers: { 'X-Simulate-Error': 'temporary-failure' },
  });

  sleep(2);

  // 再次发送正常请求，验证恢复
  let recoveryResponse = http.get(`${BASE_URL}/api/health`, {
    timeout: '5s',
  });

  check(recoveryResponse, {
    'system recovers after failure': (r) => r.status === 200,
    'recovery time acceptable': (r) => r.timings.duration < 1000,
  });
}

// 熔断器测试
export function circuitBreakerTest() {
  console.log('熔断器测试: 验证熔断器机制');

  let failureCount = 0;
  let successCount = 0;

  // 发送多个失败请求触发熔断器
  for (let i = 0; i < 10; i++) {
    let response = http.get(`${BASE_URL}/api/test-error`, {
      headers: { 'X-Simulate-Error': 'persistent-failure' },
    });

    if (response.status >= 500) {
      failureCount++;
    }
  }

  // 验证熔断器是否打开
  let circuitOpenResponse = http.get(`${BASE_URL}/api/normal-endpoint`);

  check(circuitOpenResponse, {
    'circuit breaker opens after failures': (r) =>
      r.status === 503 || r.status === 429,
  });

  // 等待恢复时间
  sleep(5);

  // 验证熔断器半开状态
  let halfOpenResponse = http.get(`${BASE_URL}/api/normal-endpoint`);

  check(halfOpenResponse, {
    'circuit breaker allows test request': (r) =>
      r.status === 200 || r.status === 503,
  });
}

export function teardown() {
  console.log('混沌测试完成');
  console.log('错误率:', errorRate.rate);
  console.log('请检查系统日志，确保所有故障都被正确处理');
}

// 测试报告生成
export function handleSummary(data) {
  return {
    'chaos-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
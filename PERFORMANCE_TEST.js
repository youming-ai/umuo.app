/**
 * 性能测试脚本 - k6
 * 用于验证AI语言学习应用系统的性能指标
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');

// 测试配置
export let options = {
  stages: [
    { duration: '30s', target: 50 },   // 预热阶段
    { duration: '1m', target: 200 },    // 负载增加
    { duration: '2m', target: 500 },    // 目标负载 (500 RPS)
    { duration: '1m', target: 200 },    // 负载减少
    { duration: '30s', target: 0 },     // 冷却阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95%的请求响应时间 < 500ms
    http_req_failed: ['rate<0.01'],      // 错误率 < 1%
    errors: ['rate<0.01'],               // 自定义错误率 < 1%
    http_reqs: ['rate>450'],             // 吞吐量 > 450 RPS
  },
};

const BASE_URL = 'http://localhost:3000';

export function setup() {
  // 测试环境准备
  console.log('开始性能测试...');
  console.log(`目标URL: ${BASE_URL}`);
}

export default function () {
  // 测试场景1: 主页访问
  let homepageResponse = http.get(`${BASE_URL}/`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  check(homepageResponse, {
    'homepage status 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
    'homepage content present': (r) => r.body.includes('AI语言学习'),
  }) || errorRate.add(1);

  // 测试场景2: API健康检查
  let healthResponse = http.get(`${BASE_URL}/api/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  check(healthResponse, {
    'health check status 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  // 测试场景3: 文件上传API (模拟)
  let uploadResponse = http.post(`${BASE_URL}/api/upload`, JSON.stringify({
    filename: 'test-audio.mp3',
    size: 1024000,
    type: 'audio/mpeg'
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(uploadResponse, {
    'upload API status': (r) => r.status >= 200 && r.status < 400,
    'upload API response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  // 测试场景4: 转录API (模拟)
  let transcribeResponse = http.post(`${BASE_URL}/api/transcribe`, JSON.stringify({
    fileId: 'test-file-id',
    language: 'zh-CN'
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(transcribeResponse, {
    'transcribe API status': (r) => r.status >= 200 && r.status < 400,
    'transcribe API response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  // 测试场景5: 进度查询API
  let progressResponse = http.get(`${BASE_URL}/api/progress/test-file-id`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  check(progressResponse, {
    'progress API status': (r) => r.status >= 200 && r.status < 400,
    'progress API response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  // 思考时间，模拟用户行为
  sleep(1);
}

export function teardown() {
  console.log('性能测试完成');
  console.log('请查看k6生成的详细报告');
}

// 辅助函数：生成随机文件ID
function generateFileId() {
  return `file-${Math.random().toString(36).substr(2, 9)}`;
}

// 压力测试配置 (可选)
export function stressTest() {
  return {
    executor: 'ramping-vus',
    stages: [
      { duration: '10s', target: 100 },
      { duration: '50s', target: 100 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.05'],
    },
  };
}

// 峰值测试配置 (可选)
export function spikeTest() {
  return {
    executor: 'ramping-vus',
    stages: [
      { duration: '10s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '10s', target: 1000 },  // 突然增加到1000用户
      { duration: '1m', target: 1000 },
      { duration: '10s', target: 10 },    // 降回正常负载
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.1'],
    },
  };
}

// 浸泡测试配置 (可选)
export function soakTest() {
  return {
    executor: 'constant-vus',
    vus: 50,
    duration: '10m',
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.01'],
    },
  };
}
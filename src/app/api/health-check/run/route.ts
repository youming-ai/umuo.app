import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { CheckCategory } from '@/lib/health-check/types';

// 请求验证schema
const runHealthCheckSchema = z.object({
  categories: z.array(z.nativeEnum(CheckCategory)).optional(),
  config: z.object({
    timeout: z.number().min(5000).max(300000).optional(), // 5秒-5分钟
    retryCount: z.number().min(0).max(5).optional(),
    parallel: z.boolean().optional(),
  }).optional(),
});

/**
 * 执行健康检查
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return apiError({
        code: 'INVALID_REQUEST',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      });
    }

    // 验证请求参数
    const validation = runHealthCheckSchema.safeParse(body);
    if (!validation.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: validation.error.issues,
        statusCode: 400,
      });
    }

    const { categories, config } = validation.data;

    // 生成检查ID
    const checkId = `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 估算执行时间（基于选择的检查类别）
    const estimatedDuration = calculateEstimatedDuration(categories, config);

    // 这里应该启动异步健康检查
    // 为了演示，我们只是返回响应
    // 在实际实现中，会调用调度器来执行检查

    return apiSuccess({
      checkId,
      status: 'started',
      estimatedDuration,
    });
  } catch (error) {
    console.error('Health check run error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
    });
  }
}

/**
 * 计算预估执行时间
 */
function calculateEstimatedDuration(
  categories?: CheckCategory[],
  config?: { timeout?: number; parallel?: boolean }
): number {
  const baseTimePerCategory = 30000; // 30 seconds per category
  const categoryCount = categories?.length || 6; // 默认所有类别

  let estimatedTime = categoryCount * baseTimePerCategory;

  // 如果并行执行，减少时间
  if (config?.parallel) {
    estimatedTime = Math.ceil(estimatedTime / 3); // 假设3个并行进程
  }

  // 考虑超时设置
  if (config?.timeout) {
    estimatedTime = Math.min(estimatedTime, config.timeout);
  }

  return Math.ceil(estimatedTime / 1000); // 转换为秒
}
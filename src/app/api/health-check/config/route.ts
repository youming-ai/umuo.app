import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { HealthCheckRepository, DEFAULT_CHECK_CONFIGS, DEFAULT_GLOBAL_CONFIG } from '@/lib/health-check/database';
import { CheckCategory, GlobalHealthCheckConfig } from '@/lib/health-check/types';

// 配置更新验证schema
const updateConfigSchema = z.object({
  categories: z.array(z.object({
    category: z.nativeEnum(CheckCategory),
    enabled: z.boolean(),
    timeout: z.number().min(1000).max(300000),
    retryCount: z.number().min(0).max(5),
    severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
    parameters: z.record(z.string(), z.any()).optional(),
  })).optional(),
  global: z.object({
    autoRun: z.boolean(),
    interval: z.number().min(60000).max(86400000), // 1分钟到24小时
    notifications: z.boolean(),
    emailReports: z.boolean(),
    retentionDays: z.number().min(1).max(365),
  }).optional(),
});

/**
 * 获取健康检查配置
 */
export async function GET() {
  try {
    // 获取所有检查配置
    const categories = await HealthCheckRepository.getAllCheckConfigs();

    // 获取全局配置
    const globalConfig = await HealthCheckRepository.getGlobalConfig();

    // 确保所有类别都有配置（使用默认值）
    const allCategories = Object.values(CheckCategory);
    const completeCategories = allCategories.map(category => {
      const existingConfig = categories.find(config =>
        // 这里需要根据实际存储结构调整匹配逻辑
        false // 临时逻辑，实际实现需要正确匹配
      );

      return existingConfig || DEFAULT_CHECK_CONFIGS[category];
    });

    return apiSuccess({
      categories: completeCategories,
      global: globalConfig || DEFAULT_GLOBAL_CONFIG,
    });
  } catch (error) {
    console.error('Health check config GET error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get config',
      statusCode: 500,
    });
  }
}

/**
 * 更新健康检查配置
 */
export async function PUT(request: NextRequest) {
  try {
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
    const validation = updateConfigSchema.safeParse(body);
    if (!validation.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid config parameters',
        details: validation.error.issues,
        statusCode: 400,
      });
    }

    const { categories, global } = validation.data;

    // 更新分类配置
    if (categories) {
      for (const config of categories) {
        await HealthCheckRepository.saveCheckConfig(config.category, config as any);
      }
    }

    // 更新全局配置
    if (global) {
      await HealthCheckRepository.saveGlobalConfig(global);
    }

    // 返回更新后的配置
    const updatedCategories = categories ?
      categories : await HealthCheckRepository.getAllCheckConfigs();

    const updatedGlobal = global ?
      global : await HealthCheckRepository.getGlobalConfig();

    return apiSuccess({
      categories: updatedCategories,
      global: updatedGlobal || DEFAULT_GLOBAL_CONFIG,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Health check config PUT error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to update config',
      statusCode: 500,
    });
  }
}
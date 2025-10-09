import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { HealthCheckRepository } from '@/lib/health-check/database';

/**
 * 获取健康检查报告
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await context.params;

    // 验证checkId格式
    if (!checkId || typeof checkId !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(checkId)) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid checkId format',
        statusCode: 400,
      });
    }

    // 从数据库获取检查报告
    const report = await HealthCheckRepository.getCheckReport(checkId);

    if (!report) {
      return apiError({
        code: 'NOT_FOUND',
        message: `Health check report with ID ${checkId} not found`,
        statusCode: 404,
      });
    }

    return apiSuccess(report);
  } catch (error) {
    console.error('Health check results error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get check results',
      statusCode: 500,
    });
  }
}
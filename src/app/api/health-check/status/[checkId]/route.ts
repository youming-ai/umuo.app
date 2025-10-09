import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { HealthCheckRepository } from '@/lib/health-check/database';
import { CheckProgress, CheckStatus } from '@/lib/health-check/types';

/**
 * 获取健康检查状态
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

    // 从数据库获取检查进度
    const progress = await HealthCheckRepository.getCheckProgress(checkId);

    if (!progress) {
      return apiError({
        code: 'NOT_FOUND',
        message: `Health check with ID ${checkId} not found`,
        statusCode: 404,
      });
    }

    // 如果检查已完成，从报告获取更详细的状态
    if (progress.current.status === CheckStatus.PASSED ||
        progress.current.status === CheckStatus.FAILED ||
        progress.current.status === CheckStatus.WARNING) {
      const report = await HealthCheckRepository.getCheckReport(checkId);
      if (report) {
        return apiSuccess({
          ...progress,
          reportId: report.id,
          summary: report.summary,
          completedAt: report.timestamp,
        });
      }
    }

    return apiSuccess(progress);
  } catch (error) {
    console.error('Health check status error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get check status',
      statusCode: 500,
    });
  }
}
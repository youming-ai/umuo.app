import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { HealthCheckRepository } from '@/lib/health-check/database';
import { CheckStatus, CheckCategory } from '@/lib/health-check/types';

// 查询参数验证schema
const getReportsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  category: z.nativeEnum(CheckCategory).optional(),
  status: z.nativeEnum(CheckStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * 获取健康检查报告列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // 验证查询参数
    const validation = getReportsSchema.safeParse(queryParams);
    if (!validation.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: validation.error.issues,
        statusCode: 400,
      });
    }

    const { limit, offset, category, status, dateFrom, dateTo } = validation.data;

    let reports;

    // 根据筛选条件获取报告
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      reports = await HealthCheckRepository.getCheckReportsByDateRange(fromDate, toDate);
    } else if (status) {
      reports = await HealthCheckRepository.getCheckReportsByStatus(status, limit);
    } else {
      reports = await HealthCheckRepository.getCheckReports(limit, offset);
    }

    // 如果指定了category，过滤结果
    if (category) {
      reports = reports.filter(report =>
        report.results.some(result => result.category === category)
      );
    }

    // 应用分页
    const totalCount = reports.length;
    const paginatedReports = reports.slice(offset, offset + limit);

    // 获取总数（用于分页信息）
    const totalReports = await HealthCheckRepository.getCheckReports(1000, 0);
    let filteredTotal = totalReports.length;

    if (category) {
      filteredTotal = totalReports.filter(report =>
        report.results.some(result => result.category === category)
      ).length;
    }

    if (status) {
      filteredTotal = totalReports.filter(report =>
        report.summary.overallStatus === status
      ).length;
    }

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      filteredTotal = totalReports.filter(report =>
        report.timestamp >= fromDate && report.timestamp <= toDate
      ).length;
    }

    return apiSuccess({
      reports: paginatedReports,
      pagination: {
        total: filteredTotal,
        limit,
        offset,
        hasMore: offset + limit < filteredTotal,
      },
    });
  } catch (error) {
    console.error('Health check reports error:', error);
    return apiError({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get reports',
      statusCode: 500,
    });
  }
}
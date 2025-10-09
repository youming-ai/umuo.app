import {
  HealthCheckResult,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
  CheckMetrics,
} from '../types';
import { enhancedGroqClient } from '@/lib/enhanced-groq-client';

/**
 * 检查API连通性
 * 验证Groq API和其他AI服务的连接状态和可用性
 */
export async function checkApiConnectivity(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checkId = `api-connectivity-${startTime}`;

  try {
    // 检查Groq API健康状态
    const groqHealth = await enhancedGroqClient.healthCheck();
    const usageStats = enhancedGroqClient.getUsageStats();
    const errorStats = enhancedGroqClient.getErrorStats();

    // 检查AI服务连通性（模拟实现）
    const aiServiceResult = await testAiServiceConnectivity();

    // 汇总检查结果
    const isHealthy = groqHealth.status === 'healthy' && aiServiceResult.connected;
    const errorRate = errorStats.errorRate;
    const responseTime = Math.max(
      aiServiceResult.responseTime || 0,
      100 // 模拟基础响应时间
    );

    // 计算性能指标
    const metrics: CheckMetrics = {
      apiResponseTime: responseTime,
      apiSuccessRate: 1 - errorRate,
      requestCount: usageStats.requestCount,
    };

    // 判断检查状态和严重级别
    let status: CheckStatus;
    let severity: SeverityLevel | undefined;
    let message: string;
    let suggestions: string[] = [];

    if (!isHealthy) {
      status = CheckStatus.FAILED;
      severity = SeverityLevel.CRITICAL;
      message = 'API connectivity issues detected';

      if (groqHealth.status !== 'healthy') {
        suggestions.push('Check GROQ_API_KEY environment variable');
        suggestions.push('Verify Groq API service status');
      }

      if (!aiServiceResult.connected) {
        suggestions.push('Check AI service configuration');
        suggestions.push('Verify network connectivity');
      }
    } else if (errorRate > 0.1) {
      // 错误率超过10%
      status = CheckStatus.WARNING;
      severity = SeverityLevel.MEDIUM;
      message = 'High error rate detected';
      suggestions.push('Monitor API performance and consider rate limiting');
      suggestions.push('Check API quota and usage limits');
    } else if (responseTime > 2000) {
      // 响应时间超过2秒
      status = CheckStatus.WARNING;
      severity = SeverityLevel.MEDIUM;
      message = 'API response time is above optimal threshold';
      suggestions.push('Consider optimizing API calls');
      suggestions.push('Check network performance');
    } else {
      status = CheckStatus.PASSED;
      message = 'All API services are healthy';
    }

    // 添加通用建议
    if (errorRate > 0.05) {
      suggestions.push('Monitor error trends and set up alerts');
    }

    return {
      id: checkId,
      category: CheckCategory.API_CONNECTIVITY,
      name: 'API Connectivity Check',
      description: 'Verifies connectivity and health of Groq API and AI services',
      status,
      severity,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      message,
      metrics,
      details: {
        groqStatus: groqHealth.status,
        groqMessage: groqHealth.message,
        aiServiceConnected: aiServiceResult.connected,
        availableModels: aiServiceResult.availableModels || [],
        lastError: usageStats.lastError?.message,
        totalRequests: usageStats.requestCount,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      autoFixAvailable: false,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    let errorType = 'UNKNOWN_ERROR';
    let severity = SeverityLevel.HIGH;
    let suggestions: string[] = [];

    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      errorType = 'TIMEOUT_ERROR';
      severity = SeverityLevel.HIGH;
      suggestions.push('Check network connection and API service status');
      suggestions.push('Verify firewall and proxy settings');
    } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      errorType = 'AUTHENTICATION_ERROR';
      severity = SeverityLevel.CRITICAL;
      suggestions.push('Verify API key configuration');
      suggestions.push('Check API key validity and permissions');
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      errorType = 'RATE_LIMIT_ERROR';
      severity = SeverityLevel.MEDIUM;
      suggestions.push('Wait before making additional requests');
      suggestions.push('Consider upgrading API plan');
    } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
      errorType = 'NETWORK_ERROR';
      severity = SeverityLevel.HIGH;
      suggestions.push('Check internet connection');
      suggestions.push('Verify DNS configuration');
    }

    return {
      id: checkId,
      category: CheckCategory.API_CONNECTIVITY,
      name: 'API Connectivity Check',
      description: 'Verifies connectivity and health of Groq API and AI services',
      status: CheckStatus.FAILED,
      severity,
      duration,
      timestamp: new Date(),
      message: `API connectivity check failed: ${errorMessage}`,
      error: {
        code: errorType,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      details: {
        errorType,
        originalError: errorMessage,
      },
      suggestions,
      autoFixAvailable: false,
    };
  }
}

/**
 * 测试AI服务连通性（模拟实现）
 * 在实际实现中，这里会测试各种AI服务的连接状态
 */
async function testAiServiceConnectivity(): Promise<{
  connected: boolean;
  responseTime?: number;
  model?: string;
  availableModels?: string[];
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // 模拟AI服务连通性测试
    // 在实际实现中，这里会调用相应的AI服务API

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const responseTime = Date.now() - startTime;

    // 模拟不同的服务状态
    const isConnected = Math.random() > 0.1; // 90% 成功率

    if (!isConnected) {
      return {
        connected: false,
        error: 'Service temporarily unavailable',
        responseTime,
      };
    }

    return {
      connected: true,
      responseTime,
      model: 'whisper-large-v3-turbo',
      availableModels: [
        'whisper-large-v3-turbo',
        'whisper-large-v3',
        'whisper-medium',
        'whisper-small',
      ],
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * 获取API服务详细状态信息
 */
export async function getApiServiceDetails(): Promise<{
  groq: {
    status: string;
    message: string;
    usageStats: any;
    errorStats: any;
  };
  aiService: {
    connected: boolean;
    responseTime: number;
    model: string;
    availableModels: string[];
  };
  recommendations: string[];
}> {
  const groqHealth = await enhancedGroqClient.healthCheck();
  const usageStats = enhancedGroqClient.getUsageStats();
  const errorStats = enhancedGroqClient.getErrorStats();
  const aiServiceResult = await testAiServiceConnectivity();

  const recommendations: string[] = [];

  // 生成建议
  if (errorStats.errorRate > 0.05) {
    recommendations.push('Error rate is above 5%, investigate recurring errors');
  }

  if (usageStats.requestCount > 1000 && errorStats.errorRate > 0.1) {
    recommendations.push('Consider implementing circuit breaker pattern');
  }

  if (!aiServiceResult.connected) {
    recommendations.push('AI service is unavailable, check configuration');
  }

  if (aiServiceResult.responseTime && aiServiceResult.responseTime > 1000) {
    recommendations.push('AI service response time is slow, consider optimization');
  }

  return {
    groq: {
      status: groqHealth.status,
      message: groqHealth.message,
      usageStats,
      errorStats,
    },
    aiService: {
      connected: aiServiceResult.connected || false,
      responseTime: aiServiceResult.responseTime || 0,
      model: aiServiceResult.model || 'unknown',
      availableModels: aiServiceResult.availableModels || [],
    },
    recommendations,
  };
}
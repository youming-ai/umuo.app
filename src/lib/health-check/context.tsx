'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  HealthCheckReport,
  HealthCheckConfig,
  GlobalHealthCheckConfig,
  CheckStatus,
  HealthCheckNotification,
} from './types';
import { HealthCheckRepository } from './database';

// 状态接口
interface HealthCheckState {
  // 当前检查状态
  currentCheck: {
    id: string | null;
    isRunning: boolean;
    progress: {
      total: number;
      completed: number;
      currentCategory: string;
      percentage: number;
    };
    estimatedTimeRemaining: number;
  };

  // 报告和历史
  reports: HealthCheckReport[];
  latestReport: HealthCheckReport | null;

  // 配置
  configs: HealthCheckConfig[];
  globalConfig: GlobalHealthCheckConfig | null;

  // 通知
  notifications: HealthCheckNotification[];

  // UI状态
  isLoading: boolean;
  error: string | null;
}

// 动作类型
type HealthCheckAction =
  | { type: 'START_CHECK'; payload: { checkId: string; totalChecks: number } }
  | { type: 'UPDATE_PROGRESS'; payload: { completed: number; currentCategory: string; percentage: number; estimatedTimeRemaining: number } }
  | { type: 'CHECK_COMPLETED'; payload: { report: HealthCheckReport } }
  | { type: 'CHECK_FAILED'; payload: { error: string } }
  | { type: 'SET_REPORTS'; payload: { reports: HealthCheckReport[] } }
  | { type: 'SET_CONFIGS'; payload: { configs: HealthCheckConfig[]; globalConfig: GlobalHealthCheckConfig } }
  | { type: 'ADD_NOTIFICATION'; payload: HealthCheckNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// 初始状态
const initialState: HealthCheckState = {
  currentCheck: {
    id: null,
    isRunning: false,
    progress: {
      total: 0,
      completed: 0,
      currentCategory: '',
      percentage: 0,
    },
    estimatedTimeRemaining: 0,
  },
  reports: [],
  latestReport: null,
  configs: [],
  globalConfig: null,
  notifications: [],
  isLoading: false,
  error: null,
};

// Reducer
function healthCheckReducer(state: HealthCheckState, action: HealthCheckAction): HealthCheckState {
  switch (action.type) {
    case 'START_CHECK':
      return {
        ...state,
        currentCheck: {
          id: action.payload.checkId,
          isRunning: true,
          progress: {
            total: action.payload.totalChecks,
            completed: 0,
            currentCategory: 'Starting...',
            percentage: 0,
          },
          estimatedTimeRemaining: 300000, // 5分钟默认值
        },
        error: null,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        currentCheck: {
          ...state.currentCheck,
          progress: {
            ...state.currentCheck.progress,
            completed: action.payload.completed,
            currentCategory: action.payload.currentCategory,
            percentage: action.payload.percentage,
          },
          estimatedTimeRemaining: action.payload.estimatedTimeRemaining,
        },
      };

    case 'CHECK_COMPLETED':
      return {
        ...state,
        currentCheck: {
          ...state.currentCheck,
          isRunning: false,
          progress: {
            ...state.currentCheck.progress,
            completed: state.currentCheck.progress.total,
            percentage: 100,
          },
          estimatedTimeRemaining: 0,
        },
        reports: [action.payload.report, ...state.reports],
        latestReport: action.payload.report,
        notifications: [
          {
            id: `complete-${Date.now()}`,
            type: action.payload.report.summary.overallStatus === CheckStatus.PASSED ? 'success' :
                  action.payload.report.summary.overallStatus === CheckStatus.WARNING ? 'warning' : 'error',
            title: 'Health Check Complete',
            message: `Score: ${action.payload.report.summary.score}% - ${action.payload.report.summary.passed}/${action.payload.report.summary.total} checks passed`,
            timestamp: new Date(),
            persistent: false,
          },
          ...state.notifications,
        ],
      };

    case 'CHECK_FAILED':
      return {
        ...state,
        currentCheck: {
          ...state.currentCheck,
          isRunning: false,
        },
        error: action.payload.error,
        notifications: [
          {
            id: `failed-${Date.now()}`,
            type: 'error',
            title: 'Health Check Failed',
            message: action.payload.error,
            timestamp: new Date(),
            persistent: true,
          },
          ...state.notifications,
        ],
      };

    case 'SET_REPORTS':
      return {
        ...state,
        reports: action.payload.reports,
        latestReport: action.payload.reports[0] || null,
      };

    case 'SET_CONFIGS':
      return {
        ...state,
        configs: action.payload.configs,
        globalConfig: action.payload.globalConfig,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.id),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Context类型
interface HealthCheckContextType {
  state: HealthCheckState;
  actions: {
    runCheck: (categories?: string[], config?: any) => Promise<void>;
    loadReports: () => Promise<void>;
    loadConfigs: () => Promise<void>;
    updateConfig: (configs: any[], globalConfig: any) => Promise<void>;
    dismissNotification: (id: string) => void;
    clearError: () => void;
  };
}

// 创建Context
const HealthCheckContext = createContext<HealthCheckContextType | null>(null);

// Provider组件
export function HealthCheckProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(healthCheckReducer, initialState);

  // 运行健康检查
  const runCheck = useCallback(async (categories?: string[], config?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await fetch('/api/health-check/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories,
          config,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to start health check');
      }

      dispatch({
        type: 'START_CHECK',
        payload: {
          checkId: result.data.checkId,
          totalChecks: categories?.length || 6,
        },
      });

      // 开始轮询状态
      pollCheckStatus(result.data.checkId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({ type: 'CHECK_FAILED', payload: { error: errorMessage } });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 轮询检查状态
  const pollCheckStatus = useCallback(async (checkId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/health-check/status/${checkId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to get check status');
        }

        const status = result.data;

        // 检查是否完成
        if (status.current?.status === 'completed' || status.reportId) {
          clearInterval(pollInterval);

          // 获取完整报告
          if (status.reportId) {
            const reportResponse = await fetch(`/api/health-check/results/${status.reportId}`);
            const reportResult = await reportResponse.json();

            if (reportResult.success) {
              dispatch({
                type: 'CHECK_COMPLETED',
                payload: { report: reportResult.data },
              });
            }
          }
        } else {
          // 更新进度
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: {
              completed: status.completed || 0,
              currentCategory: status.current?.name || 'Unknown',
              percentage: (status.completed / status.total) * 100,
              estimatedTimeRemaining: status.estimatedTimeRemaining || 0,
            },
          });
        }
      } catch (error) {
        console.error('Error polling check status:', error);
        clearInterval(pollInterval);
        dispatch({
          type: 'CHECK_FAILED',
          payload: { error: error instanceof Error ? error.message : 'Failed to check status' },
        });
      }
    }, 2000); // 每2秒轮询一次

    // 设置最大轮询时间（10分钟）
    setTimeout(() => {
      clearInterval(pollInterval);
      if (state.currentCheck.isRunning) {
        dispatch({
          type: 'CHECK_FAILED',
          payload: { error: 'Health check timed out' },
        });
      }
    }, 600000);
  }, [state.currentCheck.isRunning]);

  // 加载报告
  const loadReports = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await fetch('/api/health-check/reports?limit=20');
      const result = await response.json();

      if (result.success) {
        dispatch({
          type: 'SET_REPORTS',
          payload: { reports: result.data.reports },
        });
      } else {
        throw new Error(result.error?.message || 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load reports',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 加载配置
  const loadConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/health-check/config');
      const result = await response.json();

      if (result.success) {
        dispatch({
          type: 'SET_CONFIGS',
          payload: {
            configs: result.data.categories,
            globalConfig: result.data.global,
          },
        });
      } else {
        throw new Error(result.error?.message || 'Failed to load configs');
      }
    } catch (error) {
      console.error('Error loading configs:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load configs',
      });
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (configs: any[], globalConfig: any) => {
    try {
      const response = await fetch('/api/health-check/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: configs,
          global: globalConfig,
        }),
      });

      const result = await response.json();

      if (result.success) {
        dispatch({
          type: 'SET_CONFIGS',
          payload: {
            configs: result.data.categories,
            globalConfig: result.data.global,
          },
        });

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: `config-updated-${Date.now()}`,
            type: 'success',
            title: 'Configuration Updated',
            message: 'Health check settings have been saved',
            timestamp: new Date(),
            persistent: false,
          },
        });
      } else {
        throw new Error(result.error?.message || 'Failed to update config');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update config';
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage,
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `config-error-${Date.now()}`,
          type: 'error',
          title: 'Configuration Error',
          message: errorMessage,
          timestamp: new Date(),
          persistent: true,
        },
      });
    }
  }, []);

  // 关闭通知
  const dismissNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // 初始化数据
  useEffect(() => {
    loadReports();
    loadConfigs();
  }, [loadReports, loadConfigs]);

  const value: HealthCheckContextType = {
    state,
    actions: {
      runCheck,
      loadReports,
      loadConfigs,
      updateConfig,
      dismissNotification,
      clearError,
    },
  };

  return (
    <HealthCheckContext.Provider value={value}>
      {children}
    </HealthCheckContext.Provider>
  );
}

// Hook
export function useHealthCheck() {
  const context = useContext(HealthCheckContext);
  if (!context) {
    throw new Error('useHealthCheck must be used within HealthCheckProvider');
  }
  return context;
}
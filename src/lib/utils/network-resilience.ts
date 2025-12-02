/**
 * 网络中断恢复和重试管理器
 * 提供智能的网络中断检测、恢复和重试机制
 */

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastCheck: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterFactor: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface NetworkOperation<T> {
  id: string;
  operation: () => Promise<T>;
  config: RetryConfig;
  onProgress?: (attempt: number, maxRetries: number) => void;
  onSuccess?: (result: T) => void;
  onError?: (error: unknown, attempt: number) => void;
  onRetry?: (attempt: number, delay: number) => void;
}

/**
 * 网络状态监控器
 */
export class NetworkMonitor {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastCheck: Date.now(),
  };

  constructor() {
    // 监听在线/离线事件
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // 如果支持网络信息API，监听网络变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleConnectionChange.bind(this));
      this.updateNetworkInfo();
    }

    // 定期检查网络状态
    this.startPeriodicCheck();
  }

  /**
   * 添加网络状态监听器
   */
  addListener(callback: (status: NetworkStatus) => void): void {
    this.listeners.push(callback);
    // 立即通知当前状态
    callback(this.currentStatus);
  }

  /**
   * 移除网络状态监听器
   */
  removeListener(callback: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 获取当前网络状态
   */
  getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * 检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 尝试连接到可靠的服务器
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });

      const isOnline = response.ok;
      this.updateStatus({ isOnline: isOnline, lastCheck: Date.now() });
      return isOnline;
    } catch (error) {
      this.updateStatus({ isOnline: false, lastCheck: Date.now() });
      return false;
    }
  }

  /**
   * 处理网络在线事件
   */
  private handleOnline(): void {
    this.updateStatus({ isOnline: true, lastCheck: Date.now() });
  }

  /**
   * 处理网络离线事件
   */
  private handleOffline(): void {
    this.updateStatus({ isOnline: false, lastCheck: Date.now() });
  }

  /**
   * 处理网络连接变化
   */
  private handleConnectionChange(): void {
    this.updateNetworkInfo();
  }

  /**
   * 更新网络信息
   */
  private updateNetworkInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateStatus({
        isOnline: navigator.onLine,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        lastCheck: Date.now(),
      });
    }
  }

  /**
   * 更新状态并通知监听器
   */
  private updateStatus(updates: Partial<NetworkStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...updates };
    this.listeners.forEach(callback => {
      try {
        callback(this.currentStatus);
      } catch (error) {
        console.error('网络状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 开始定期检查
   */
  private startPeriodicCheck(): void {
    setInterval(() => {
      this.checkConnection();
    }, 30000); // 每30秒检查一次
  }
}

/**
 * 网络恢复管理器
 */
export class NetworkResilienceManager {
  private networkMonitor: NetworkMonitor;
  private pendingOperations: Map<string, NetworkOperation<any>> = new Map();
  private retryQueue: NetworkOperation<any>[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.networkMonitor = new NetworkMonitor();
    this.setupNetworkListeners();
  }

  /**
   * 执行带网络恢复的操作
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    options: {
      onProgress?: (attempt: number, maxRetries: number) => void;
      onSuccess?: (result: T) => void;
      onError?: (error: unknown, attempt: number) => void;
      onRetry?: (attempt: number, delay: number) => void;
    } = {}
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitterFactor: 0.3,
      ...config,
    };

    const operationId = this.generateOperationId();
    const networkOperation: NetworkOperation<T> = {
      id: operationId,
      operation,
      config: finalConfig,
      ...options,
    };

    return new Promise<T>((resolve, reject) => {
      networkOperation.onSuccess = (result) => {
        this.pendingOperations.delete(operationId);
        options.onSuccess?.(result);
        resolve(result);
      };

      networkOperation.onError = (error, attempt) => {
        options.onError?.(error, attempt);

        if (attempt >= finalConfig.maxRetries) {
          this.pendingOperations.delete(operationId);
          reject(error);
        }
      };

      this.pendingOperations.set(operationId, networkOperation);
      this.executeOperation(networkOperation);
    });
  }

  /**
   * 设置网络监听器
   */
  private setupNetworkListeners(): void {
    this.networkMonitor.addListener((status) => {
      if (status.isOnline && !this.isProcessingQueue) {
        this.processRetryQueue();
      }
    });
  }

  /**
   * 执行单个操作
   */
  private async executeOperation<T>(networkOperation: NetworkOperation<T>): Promise<void> {
    const { operation, config, onProgress, onRetry } = networkOperation;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        onProgress?.(attempt, config.maxRetries);

        // 检查网络状态
        const networkStatus = this.networkMonitor.getCurrentStatus();
        if (!networkStatus.isOnline) {
          throw new Error('网络连接不可用');
        }

        // 执行操作
        const result = await operation();

        // 成功执行
        networkOperation.onSuccess?.(result);
        return;

      } catch (error) {
        attempt++;

        // 检查是否应该重试
        if (config.retryCondition && !config.retryCondition(error)) {
          networkOperation.onError?.(error, attempt);
          return;
        }

        // 最后一次尝试失败
        if (attempt > config.maxRetries) {
          networkOperation.onError?.(error, attempt);
          return;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt, config);

        // 通知重试
        onRetry?.(attempt, delay);

        console.warn(`网络操作失败，${delay}ms后重试 (${attempt}/${config.maxRetries})`, error);

        // 等待重试
        await this.sleep(delay);
      }
    }
  }

  /**
   * 处理重试队列
   */
  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 开始处理重试队列 (${this.retryQueue.length} 个操作)`);

    while (this.retryQueue.length > 0) {
      const operation = this.retryQueue.shift()!;

      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('重试操作失败:', error);
      }
    }

    this.isProcessingQueue = false;
    console.log('✅ 重试队列处理完成');
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // 指数退避
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);

    // 添加随机抖动
    const jitter = exponentialDelay * config.jitterFactor * Math.random();

    // 限制最大延迟
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  /**
   * 添加到重试队列
   */
  private addToRetryQueue<T>(operation: NetworkOperation<T>): void {
    this.retryQueue.push(operation);
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取网络监控器
   */
  getNetworkMonitor(): NetworkMonitor {
    return this.networkMonitor;
  }

  /**
   * 取消所有待处理操作
   */
  cancelAllOperations(): void {
    this.pendingOperations.clear();
    this.retryQueue.length = 0;
    console.log('🚫 已取消所有网络操作');
  }

  /**
   * 获取待处理操作数量
   */
  getPendingOperationsCount(): number {
    return this.pendingOperations.size + this.retryQueue.length;
  }
}

// 全局网络恢复管理器实例
export const networkResilienceManager = new NetworkResilienceManager();

/**
 * 便捷函数: 执行带网络恢复的fetch请求
 */
export async function resilientFetch(
  url: string,
  options: RequestInit & { retryConfig?: Partial<RetryConfig> } = {}
): Promise<Response> {
  const { retryConfig, ...fetchOptions } = options;

  return networkResilienceManager.executeWithResilience(
    () => fetch(url, fetchOptions),
    retryConfig
  );
}

/**
 * 便捷Hook: useNetworkStatus
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() =>
    networkResilienceManager.getNetworkMonitor().getCurrentStatus()
  );

  useEffect(() => {
    const monitor = networkResilienceManager.getNetworkMonitor();

    const handleStatusChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
    };

    monitor.addListener(handleStatusChange);

    return () => {
      monitor.removeListener(handleStatusChange);
    };
  }, []);

  return networkStatus;
}

// 导出类型和实例
export type { NetworkStatus, RetryConfig, NetworkOperation };

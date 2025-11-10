import Groq from "groq-sdk";

export interface GroqClientConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface GroqClientMetrics {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
}

/**
 * Enhanced Groq SDK client factory with connection pooling and performance monitoring
 *
 * Features:
 * - Connection pooling to reduce connection overhead
 * - Client reuse and caching
 * - Performance metrics tracking
 * - Automatic cleanup of idle connections
 * - Error handling and recovery
 */
export class GroqClientFactory {
  private static instance: GroqClientFactory;
  private clients: Map<string, Groq> = new Map();
  private connectionPool: Groq[] = [];
  private maxPoolSize = 5;
  private clientMetrics: Map<string, GroqClientMetrics> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval for idle connections
    this.startCleanupInterval();
  }

  static getInstance(): GroqClientFactory {
    if (!this.instance) {
      this.instance = new GroqClientFactory();
    }
    return this.instance;
  }

  /**
   * Get or create a Groq client with the specified configuration
   */
  getClient(config: GroqClientConfig): Groq {
    const key = this.generateKey(config);

    if (!this.clients.has(key)) {
      const client = new Groq({
        apiKey: config.apiKey,
        baseURL:
          config.baseURL ||
          process.env.GROQ_BASE_URL ||
          "https://api.groq.com/openai/v1",
        timeout:
          config.timeout || parseInt(process.env.GROQ_TIMEOUT_MS || "25000"),
        maxRetries:
          config.maxRetries || parseInt(process.env.GROQ_MAX_RETRIES || "2"),
      });

      this.clients.set(key, client);
      this.addToPool(client);

      // Initialize metrics for this client
      this.clientMetrics.set(key, {
        id: key,
        createdAt: new Date(),
        lastUsed: new Date(),
        requestCount: 0,
        averageResponseTime: 0,
        errorCount: 0,
      });

      console.log(`Created new Groq client: ${key}`);
    }

    // Update last used time
    const metrics = this.clientMetrics.get(key);
    if (metrics) {
      metrics.lastUsed = new Date();
    }

    return this.clients.get(key)!;
  }

  /**
   * Add client to connection pool if space is available
   */
  private addToPool(client: Groq): void {
    if (this.connectionPool.length < this.maxPoolSize) {
      this.connectionPool.push(client);
    } else {
      // Pool is full, remove the oldest client
      const oldestClient = this.connectionPool.shift();
      if (oldestClient) {
        // Find and remove the oldest client from the clients map
        for (const [key, value] of this.clients.entries()) {
          if (value === oldestClient) {
            this.clients.delete(key);
            this.clientMetrics.delete(key);
            break;
          }
        }
      }
      this.connectionPool.push(client);
    }
  }

  /**
   * Generate a unique key for the client configuration
   */
  private generateKey(config: GroqClientConfig): string {
    const baseURL = config.baseURL || process.env.GROQ_BASE_URL || "default";
    const apiKeyHash = config.apiKey.slice(0, 8);
    return `${apiKeyHash}_${baseURL}`;
  }

  /**
   * Get performance metrics for all clients
   */
  getMetrics(): GroqClientMetrics[] {
    return Array.from(this.clientMetrics.values());
  }

  /**
   * Get metrics for a specific client
   */
  getClientMetrics(clientKey: string): GroqClientMetrics | undefined {
    return this.clientMetrics.get(clientKey);
  }

  /**
   * Update metrics for a client after a request
   */
  updateClientMetrics(
    clientKey: string,
    responseTime: number,
    isError: boolean = false,
  ): void {
    const metrics = this.clientMetrics.get(clientKey);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.lastUsed = new Date();

    if (isError) {
      metrics.errorCount++;
    }

    // Update average response time
    const totalResponseTime =
      metrics.averageResponseTime * (metrics.requestCount - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.requestCount;
  }

  /**
   * Get optimal client from pool based on performance metrics
   */
  getOptimalClient(config: GroqClientConfig): Groq {
    const key = this.generateKey(config);

    // If we have a client for this config, use it
    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    // Find the best performing client from the pool
    if (this.connectionPool.length > 0) {
      let bestClient = this.connectionPool[0];
      let bestMetrics = this.clientMetrics.get(
        this.generateKey({
          apiKey: "",
          baseURL: bestClient.baseURL,
        }),
      );

      for (const client of this.connectionPool) {
        const clientKey = this.generateKey({
          apiKey: "",
          baseURL: client.baseURL,
        });
        const metrics = this.clientMetrics.get(clientKey);

        if (
          metrics &&
          bestMetrics &&
          metrics.averageResponseTime < bestMetrics.averageResponseTime &&
          metrics.errorCount < bestMetrics.errorCount
        ) {
          bestClient = client;
          bestMetrics = metrics;
        }
      }

      return bestClient;
    }

    // Create new client if no suitable one found
    return this.getClient(config);
  }

  /**
   * Cleanup idle connections and clients
   */
  private cleanupIdleConnections(): void {
    const now = new Date();
    const idleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [key, metrics] of this.clientMetrics.entries()) {
      const idleTime = now.getTime() - metrics.lastUsed.getTime();

      if (idleTime > idleThreshold) {
        // Remove idle client
        const client = this.clients.get(key);
        if (client) {
          const poolIndex = this.connectionPool.indexOf(client);
          if (poolIndex > -1) {
            this.connectionPool.splice(poolIndex, 1);
          }
        }

        this.clients.delete(key);
        this.clientMetrics.delete(key);
        console.log(`Cleaned up idle Groq client: ${key}`);
      }
    }
  }

  /**
   * Start cleanup interval for idle connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupIdleConnections();
      },
      10 * 60 * 1000,
    ); // Run every 10 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Close all connections and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.stopCleanupInterval();
    this.clients.clear();
    this.connectionPool.length = 0;
    this.clientMetrics.clear();
    console.log("GroqClientFactory shutdown complete");
  }

  /**
   * Get current pool status
   */
  getPoolStatus(): {
    totalClients: number;
    poolSize: number;
    activeConnections: number;
    metricsSummary: {
      totalRequests: number;
      averageResponseTime: number;
      totalErrors: number;
      errorRate: number;
    };
  } {
    const metrics = Array.from(this.clientMetrics.values());
    const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalResponseTime = metrics.reduce(
      (sum, m) => sum + m.averageResponseTime * m.requestCount,
      0,
    );

    return {
      totalClients: this.clients.size,
      poolSize: this.connectionPool.length,
      activeConnections: metrics.filter(
        (m) => new Date().getTime() - m.lastUsed.getTime() < 5 * 60 * 1000, // Active in last 5 minutes
      ).length,
      metricsSummary: {
        totalRequests,
        averageResponseTime:
          totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      },
    };
  }
}

// Export singleton instance for easy access
export const groqClientFactory = GroqClientFactory.getInstance();

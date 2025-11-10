/**
 * Maintenance Scheduler System
 *
 * This module provides a comprehensive maintenance scheduling system that handles
 * background operations, configurable schedules, and intelligent execution timing.
 */

import {
  MaintenanceOperation,
  MaintenanceOperationType,
  MaintenanceOperationStatus,
  MaintenanceOperationPriority,
  MaintenanceSchedule,
  MaintenanceScheduleType,
  MaintenanceCondition,
  IMaintenanceManager,
  MaintenanceSystemConfig,
  MaintenanceSystemStatus,
  IMaintenanceLogger,
  IProgressTracker,
  INotificationManager,
} from "./types";
import { handleError } from "../utils/error-handler";
import { EventEmitter } from "events";

// ============================================================================
// SCHEDULER CORE INTERFACES
// ============================================================================

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  enabled: boolean;
  maxConcurrentOperations: number;
  operationTimeout: number;
  retryAttempts: number;
  retryDelay: number;

  // Scheduling preferences
  preferences: {
    preferIdleTime: boolean;
    idleThreshold: number; // milliseconds of inactivity
    quietHours: {
      start: string; // HH:MM
      end: string; // HH:MM
      timezone: string;
    };
    avoidUserInterruption: boolean;
    batteryThreshold: number; // minimum battery percentage
    networkRequirements: {
      requireWifi: boolean;
      allowCellular: boolean;
    };
  };

  // Performance settings
  performance: {
    adaptiveScheduling: boolean;
    priorityBoost: number; // multiplier for urgent operations
    loadBalancing: boolean;
    resourceMonitoring: boolean;
  };
}

/**
 * Queue entry for scheduled operations
 */
export interface QueueEntry {
  operation: MaintenanceOperation;
  schedule: MaintenanceSchedule;
  nextExecution: Date;
  retryCount: number;
  lastExecution?: Date;
  priority: number; // calculated priority score
}

/**
 * Execution context for running operations
 */
export interface ExecutionContext {
  operation: MaintenanceOperation;
  startTime: Date;
  timeoutId?: NodeJS.Timeout;
  abortController?: AbortController;
  resourceMonitor?: ResourceMonitor;
}

/**
 * Resource monitoring information
 */
export interface ResourceMonitor {
  startTime: Date;
  initialMemory: number;
  peakMemory: number;
  initialCPU: number;
  peakCPU: number;
  networkBytesTransferred: number;
  interruptions: number;
}

/**
 * Scheduler statistics
 */
export interface SchedulerStatistics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  queueLength: number;
  lastExecution?: Date;

  // Performance metrics
  resourceUsage: {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCPUUsage: number;
    networkUsage: number;
  };

  // Scheduling metrics
  scheduling: {
    onTimeExecutions: number;
    delayedExecutions: number;
    idleTimeExecutions: number;
    userInterruptionPrevented: number;
  };
}

// ============================================================================
// MAINTENANCE SCHEDULER
// ============================================================================

/**
 * Main maintenance scheduler class
 */
export class MaintenanceScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Queue management
  private queue: QueueEntry[] = [];
  private runningOperations: Map<string, ExecutionContext> = new Map();
  private completedOperations: MaintenanceOperation[] = [];

  // Timing and scheduling
  private scheduleTimer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;
  private lastActivityTime: Date = new Date();

  // Resource monitoring
  private resourceMonitor?: ResourceMonitor;
  private performanceBaseline: {
    memory: number;
    cpu: number;
  } = { memory: 0, cpu: 0 };

  // Dependencies
  private logger: IMaintenanceLogger;
  private progressTracker: IProgressTracker;
  private notificationManager: INotificationManager;

  // Statistics
  private statistics: SchedulerStatistics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    queueLength: 0,

    resourceUsage: {
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      averageCPUUsage: 0,
      networkUsage: 0,
    },

    scheduling: {
      onTimeExecutions: 0,
      delayedExecutions: 0,
      idleTimeExecutions: 0,
      userInterruptionPrevented: 0,
    },
  };

  constructor(
    config: SchedulerConfig,
    logger: IMaintenanceLogger,
    progressTracker: IProgressTracker,
    notificationManager: INotificationManager
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.progressTracker = progressTracker;
    this.notificationManager = notificationManager;

    this.setupEventHandlers();
    this.initializeResourceMonitoring();
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Scheduler is already running");
      return;
    }

    try {
      this.logger.info("Starting maintenance scheduler");

      this.isRunning = true;
      this.isPaused = false;

      // Load any existing schedules from storage
      await this.loadPersistedSchedules();

      // Start the main scheduling loop
      this.startSchedulingLoop();

      // Start activity monitoring for idle-time execution
      this.startActivityMonitoring();

      // Start resource monitoring
      this.startResourceMonitoring();

      this.logger.info("Maintenance scheduler started successfully");
      this.emit("started");
    } catch (error) {
      this.logger.error("Failed to start maintenance scheduler", error as Error);
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn("Scheduler is not running");
      return;
    }

    try {
      this.logger.info("Stopping maintenance scheduler");

      this.isRunning = false;

      // Cancel all running operations
      await this.cancelAllOperations();

      // Clear timers
      if (this.scheduleTimer) {
        clearTimeout(this.scheduleTimer);
      }

      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      // Persist schedules and statistics
      await this.persistSchedules();
      await this.persistStatistics();

      this.logger.info("Maintenance scheduler stopped successfully");
      this.emit("stopped");
    } catch (error) {
      this.logger.error("Failed to stop maintenance scheduler", error as Error);
      throw error;
    }
  }

  /**
   * Pause the scheduler
   */
  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.logger.info("Maintenance scheduler paused");
    this.emit("paused");
  }

  /**
   * Resume the scheduler
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.lastActivityTime = new Date();
    this.logger.info("Maintenance scheduler resumed");
    this.emit("resumed");
  }

  /**
   * Schedule a maintenance operation
   */
  scheduleOperation(
    operation: Omit<MaintenanceOperation, "id" | "createdAt" | "progress">,
    schedule: MaintenanceSchedule
  ): string {
    const operationId = this.generateOperationId();

    const fullOperation: MaintenanceOperation = {
      ...operation,
      id: operationId,
      createdAt: new Date(),
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
        message: "Scheduled",
        stage: "pending",
      },
    };

    const queueEntry: QueueEntry = {
      operation: fullOperation,
      schedule,
      nextExecution: this.calculateNextExecution(schedule),
      retryCount: 0,
      priority: this.calculatePriority(fullOperation, schedule),
    };

    this.queue.push(queueEntry);
    this.sortQueue();

    this.logger.info(`Scheduled operation ${operationId}`, {
      type: operation.type,
      nextExecution: queueEntry.nextExecution,
      priority: queueEntry.priority,
    });

    this.emit("operationScheduled", fullOperation);

    return operationId;
  }

  /**
   * Cancel a scheduled operation
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    // Check if operation is running
    if (this.runningOperations.has(operationId)) {
      const context = this.runningOperations.get(operationId)!;

      if (context.abortController) {
        context.abortController.abort();
      }

      if (context.timeoutId) {
        clearTimeout(context.timeoutId);
      }

      this.runningOperations.delete(operationId);

      const operation = context.operation;
      operation.status = MaintenanceOperationStatus.CANCELLED;

      this.logger.info(`Cancelled running operation ${operationId}`);
      this.emit("operationCancelled", operation);

      return true;
    }

    // Check if operation is in queue
    const queueIndex = this.queue.findIndex(entry => entry.operation.id === operationId);
    if (queueIndex >= 0) {
      const entry = this.queue.splice(queueIndex, 1)[0];
      entry.operation.status = MaintenanceOperationStatus.CANCELLED;

      this.logger.info(`Cancelled queued operation ${operationId}`);
      this.emit("operationCancelled", entry.operation);

      return true;
    }

    return false;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    queueLength: number;
    runningOperations: number;
    statistics: SchedulerStatistics;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
      runningOperations: this.runningOperations.size,
      statistics: { ...this.statistics },
    };
  }

  /**
   * Get queued operations
   */
  getQueuedOperations(): MaintenanceOperation[] {
    return this.queue.map(entry => entry.operation);
  }

  /**
   * Get running operations
   */
  getRunningOperations(): MaintenanceOperation[] {
    return Array.from(this.runningOperations.values()).map(context => context.operation);
  }

  /**
   * Get completed operations
   */
  getCompletedOperations(limit?: number): MaintenanceOperation[] {
    const operations = [...this.completedOperations].sort(
      (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    );

    return limit ? operations.slice(0, limit) : operations;
  }

  /**
   * Update scheduler configuration
   */
  updateConfiguration(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info("Scheduler configuration updated", config);
    this.emit("configurationUpdated", this.config);
  }

  /**
   * Force execution of pending operations
   */
  async forceExecution(): Promise<void> {
    this.logger.info("Force execution triggered");

    while (this.canExecuteOperation() && this.queue.length > 0) {
      await this.executeNextOperation();
    }
  }

  // ============================================================================
  // PRIVATE METHODS - SCHEDULING LOGIC
  // ============================================================================

  /**
   * Start the main scheduling loop
   */
  private startSchedulingLoop(): void {
    const scheduleLoop = async () => {
      if (!this.isRunning || this.isPaused) {
        this.scheduleTimer = setTimeout(scheduleLoop, 5000); // Check every 5 seconds
        return;
      }

      try {
        // Check for operations ready to execute
        await this.checkReadyOperations();

        // Check for overdue operations
        await this.checkOverdueOperations();

        // Clean up old completed operations
        this.cleanupOldOperations();

      } catch (error) {
        this.logger.error("Error in scheduling loop", error as Error);
      }

      // Schedule next check
      this.scheduleTimer = setTimeout(scheduleLoop, 5000);
    };

    scheduleLoop();
  }

  /**
   * Check for operations ready to execute
   */
  private async checkReadyOperations(): Promise<void> {
    const now = new Date();
    const readyEntries = this.queue.filter(entry => entry.nextExecution <= now);

    for (const entry of readyEntries) {
      if (this.canExecuteOperation()) {
        await this.executeOperation(entry);
      } else {
        // Cannot execute now, update next execution time
        entry.nextExecution = this.calculateNextExecution(entry.schedule);
      }
    }
  }

  /**
   * Check for overdue operations
   */
  private async checkOverdueOperations(): Promise<void> {
    const now = new Date();
    const maxDelay = 30 * 60 * 1000; // 30 minutes

    for (const entry of this.queue) {
      const delay = now.getTime() - entry.nextExecution.getTime();

      if (delay > maxDelay && entry.schedule.retry.retryAttempts > entry.retryCount) {
        this.logger.warn(`Operation ${entry.operation.id} is overdue by ${Math.floor(delay / 1000 / 60)} minutes`, {
          operationType: entry.operation.type,
          retryCount: entry.retryCount,
          maxRetries: entry.schedule.retry.retryAttempts,
        });

        // Increase priority and try to execute
        entry.priority *= 1.5;
        this.sortQueue();
      }
    }
  }

  /**
   * Execute the next operation in the queue
   */
  private async executeNextOperation(): Promise<void> {
    if (this.queue.length === 0 || !this.canExecuteOperation()) {
      return;
    }

    const entry = this.queue.shift()!;
    await this.executeOperation(entry);
  }

  /**
   * Execute a specific operation
   */
  private async executeOperation(entry: QueueEntry): Promise<void> {
    const operation = entry.operation;
    operation.status = MaintenanceOperationStatus.RUNNING;
    operation.startedAt = new Date();

    this.logger.info(`Starting execution of operation ${operation.id}`, {
      type: operation.type,
      priority: entry.priority,
    });

    // Create execution context
    const context: ExecutionContext = {
      operation,
      startTime: new Date(),
      abortController: new AbortController(),
      resourceMonitor: this.createResourceMonitor(),
    };

    this.runningOperations.set(operation.id, context);
    this.statistics.totalOperations++;

    try {
      // Set timeout
      context.timeoutId = setTimeout(() => {
        if (!context.abortController?.signal.aborted) {
          context.abortController?.abort();
          this.logger.warn(`Operation ${operation.id} timed out`);
        }
      }, this.config.operationTimeout);

      // Execute the operation
      const handler = this.getOperationHandler(operation.type);
      if (!handler) {
        throw new Error(`No handler found for operation type: ${operation.type}`);
      }

      const executionContext = this.createExecutionContext(operation);
      const results = await handler.execute(operation, executionContext);

      // Handle successful completion
      await this.handleOperationCompletion(operation, results, true);

    } catch (error) {
      // Handle execution failure
      await this.handleOperationFailure(operation, entry, error as Error);
    } finally {
      // Clean up
      if (context.timeoutId) {
        clearTimeout(context.timeoutId);
      }

      this.runningOperations.delete(operation.id);

      // Update statistics
      this.updateStatistics(context);
    }
  }

  /**
   * Handle successful operation completion
   */
  private async handleOperationCompletion(
    operation: MaintenanceOperation,
    results: any,
    success: boolean
  ): Promise<void> {
    operation.status = MaintenanceOperationStatus.COMPLETED;
    operation.completedAt = new Date();
    operation.actualDuration = operation.completedAt.getTime() - (operation.startedAt?.getTime() || 0);
    operation.results = results;

    if (success) {
      this.statistics.successfulOperations++;

      this.logger.info(`Operation ${operation.id} completed successfully`, {
        duration: operation.actualDuration,
        results,
      });

      // Send completion notification
      await this.notificationManager.sendCompletionNotification(operation, results);
    }

    this.completedOperations.push(operation);
    this.emit("operationCompleted", operation);

    // Check for dependent operations
    this.checkDependentOperations(operation);
  }

  /**
   * Handle operation failure
   */
  private async handleOperationFailure(
    operation: MaintenanceOperation,
    entry: QueueEntry,
    error: Error
  ): Promise<void> {
    this.logger.error(`Operation ${operation.id} failed`, error, {
      operationType: operation.type,
      retryCount: entry.retryCount,
    });

    // Check if we should retry
    if (entry.retryCount < entry.schedule.retry.retryAttempts) {
      entry.retryCount++;
      entry.nextExecution = this.calculateRetryTime(entry.schedule, entry.retryCount);
      entry.operation.status = MaintenanceOperationStatus.PENDING;

      // Re-add to queue
      this.queue.push(entry);
      this.sortQueue();

      this.logger.info(`Scheduled retry ${entry.retryCount}/${entry.schedule.retry.retryAttempts} for operation ${operation.id}`);
    } else {
      // Max retries reached, mark as failed
      operation.status = MaintenanceOperationStatus.FAILED;
      operation.error = error;
      operation.completedAt = new Date();

      this.statistics.failedOperations++;

      // Send error notification
      await this.notificationManager.sendErrorNotification(operation, error);

      this.completedOperations.push(operation);
      this.emit("operationFailed", operation);
    }
  }

  /**
   * Check if an operation can be executed
   */
  private canExecuteOperation(): boolean {
    if (!this.isRunning || this.isPaused) {
      return false;
    }

    // Check concurrent operation limit
    if (this.runningOperations.size >= this.config.maxConcurrentOperations) {
      return false;
    }

    // Check resource constraints
    if (!this.checkResourceConstraints()) {
      return false;
    }

    // Check user activity
    if (this.config.preferences.avoidUserInterruption && this.isUserActive()) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      return false;
    }

    // Check battery level
    if (!this.checkBatteryLevel()) {
      return false;
    }

    // Check network requirements
    if (!this.checkNetworkRequirements()) {
      return false;
    }

    return true;
  }

  /**
   * Check resource constraints
   */
  private checkResourceConstraints(): boolean {
    if (!this.config.performance.resourceMonitoring) {
      return true;
    }

    // In a real implementation, this would check actual system resources
    // For now, we'll use simple heuristics

    return true;
  }

  /**
   * Check if user is currently active
   */
  private isUserActive(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivityTime.getTime();
    return timeSinceActivity < this.config.preferences.idleThreshold;
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    const { start, end, timezone } = this.config.preferences.quietHours;

    try {
      const now = new Date();
      const currentTime = this.getTimeInTimezone(now, timezone);

      const [startHour, startMinute] = start.split(":").map(Number);
      const [endHour, endMinute] = end.split(":").map(Number);

      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (startMinutes <= endMinutes) {
        // Same day range (e.g., 22:00 - 06:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        // Overnight range (e.g., 22:00 - 06:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (error) {
      this.logger.warn("Error checking quiet hours", error);
      return false;
    }
  }

  /**
   * Check battery level
   */
  private checkBatteryLevel(): boolean {
    // In a browser environment, check actual battery level
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      return navigator.getBattery().then(battery => {
        return battery.level >= (this.config.preferences.batteryThreshold / 100) || battery.charging;
      }).catch(() => true);
    }

    // Fallback: assume battery is OK
    return true;
  }

  /**
   * Check network requirements
   */
  private checkNetworkRequirements(): boolean {
    if (!this.config.preferences.networkRequirements.requireWifi) {
      return true;
    }

    // In a browser environment, check actual connection type
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType === "wifi" || connection.effectiveType === "ethernet";
    }

    // Fallback: assume network requirements are met
    return true;
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate priority score for an operation
   */
  private calculatePriority(operation: MaintenanceOperation, schedule: MaintenanceSchedule): number {
    let priority = operation.priority * 1000;

    // Adjust based on schedule urgency
    const now = new Date();
    const delay = schedule.timing.executeAt
      ? schedule.timing.executeAt.getTime() - now.getTime()
      : Infinity;

    if (delay < 0) {
      priority *= 2; // Overdue operations get higher priority
    } else if (delay < 60 * 60 * 1000) { // Within 1 hour
      priority *= 1.5;
    }

    // Adjust based on operation type
    const typeMultipliers: Record<MaintenanceOperationType, number> = {
      [MaintenanceOperationType.CLEANUP_EXPIRED_DATA]: 1.0,
      [MaintenanceOperationType.DATABASE_OPTIMIZATION]: 0.8,
      [MaintenanceOperationType.DATA_INTEGRITY_CHECK]: 0.6,
      [MaintenanceOperationType.MOBILE_STORAGE_OPTIMIZATION]: 1.2,
      [MaintenanceOperationType.SYSTEM_HEALTH_CHECK]: 0.5,
      // Add other operation types as needed
    };

    priority *= typeMultipliers[operation.type] || 1.0;

    return priority;
  }

  /**
   * Calculate next execution time for a schedule
   */
  private calculateNextExecution(schedule: MaintenanceSchedule): Date {
    const now = new Date();

    switch (schedule.type) {
      case MaintenanceScheduleType.IMMEDIATE:
        return new Date(now.getTime() + 1000); // 1 second from now

      case MaintenanceScheduleType.ONCE:
        return schedule.timing.executeAt || new Date(now.getTime() + 60000); // Default to 1 minute

      case MaintenanceScheduleType.RECURRING:
        if (schedule.timing.interval) {
          return new Date(now.getTime() + schedule.timing.interval);
        }
        // Fall back to default
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      case MaintenanceScheduleType.CONDITIONAL:
        // For conditional schedules, check condition periodically
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      case MaintenanceScheduleType.IDLE_TIME:
        return new Date(now.getTime() + schedule.timing.idleThreshold || 15 * 60 * 1000); // 15 minutes default

      case MaintenanceScheduleType.STARTUP:
        return new Date(now.getTime() + (schedule.timing.delay || 30) * 1000); // 30 seconds default

      default:
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default
    }
  }

  /**
   * Calculate retry time with backoff
   */
  private calculateRetryTime(schedule: MaintenanceSchedule, retryCount: number): Date {
    const { retry } = schedule;
    let delay: number;

    switch (retry.backoffStrategy) {
      case "linear":
        delay = retry.baseDelay * retryCount;
        break;
      case "exponential":
        delay = retry.baseDelay * Math.pow(2, retryCount - 1);
        break;
      case "fixed":
      default:
        delay = retry.baseDelay;
        break;
    }

    // Add jitter and cap at max delay
    delay = Math.min(delay + Math.random() * 1000, retry.maxDelay);

    return new Date(Date.now() + delay);
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority (higher first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      // Then by next execution time (earlier first)
      return a.nextExecution.getTime() - b.nextExecution.getTime();
    });
  }

  /**
   * Get operation handler for type
   */
  private getOperationHandler(type: MaintenanceOperationType): any {
    // This would be injected or provided by the maintenance manager
    // For now, return null to indicate no handler
    return null;
  }

  /**
   * Create execution context for operation
   */
  private createExecutionContext(operation: MaintenanceOperation): any {
    // This would create the full execution context with all dependencies
    // For now, return a minimal context
    return {
      systemInfo: {
        platform: typeof window !== "undefined" ? "browser" : "node",
        architecture: "unknown",
      },
      resourceStatus: {
        availableMemory: 1000000000, // 1GB
        availableStorage: 10000000000, // 10GB
        batteryLevel: 100,
        networkType: "wifi",
        isPowerConnected: true,
      },
      config: {} as MaintenanceSystemConfig,
    };
  }

  /**
   * Check for dependent operations that can now be executed
   */
  private checkDependentOperations(completedOperation: MaintenanceOperation): void {
    for (const entry of this.queue) {
      if (entry.operation.metadata.dependencies.includes(completedOperation.id)) {
        // This operation was waiting for the completed one
        // Recalculate priority in case it can now be executed sooner
        entry.priority = this.calculatePriority(entry.operation, entry.schedule);
      }
    }

    this.sortQueue();
  }

  /**
   * Clean up old completed operations
   */
  private cleanupOldOperations(): void {
    const maxCompleted = 100; // Keep last 100 completed operations
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    this.completedOperations = this.completedOperations.filter(op => {
      const completedAt = op.completedAt;
      if (!completedAt) return false;

      return completedAt > cutoffTime;
    });

    // Also limit by count
    if (this.completedOperations.length > maxCompleted) {
      this.completedOperations = this.completedOperations
        .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
        .slice(0, maxCompleted);
    }
  }

  /**
   * Update statistics after operation completion
   */
  private updateStatistics(context: ExecutionContext): void {
    const operation = context.operation;
    const duration = Date.now() - context.startTime.getTime();

    // Update execution time statistics
    this.statistics.totalExecutionTime += duration;
    this.statistics.averageExecutionTime = this.statistics.totalExecutionTime / this.statistics.totalOperations;

    // Update queue length
    this.statistics.queueLength = this.queue.length;
    this.statistics.lastExecution = new Date();

    // Update resource usage statistics
    if (context.resourceMonitor) {
      const monitor = context.resourceMonitor;
      this.statistics.resourceUsage.averageMemoryUsage += monitor.initialMemory;
      this.statistics.resourceUsage.averageCPUUsage += monitor.initialCPU;

      if (monitor.peakMemory > this.statistics.resourceUsage.peakMemoryUsage) {
        this.statistics.resourceUsage.peakMemoryUsage = monitor.peakMemory;
      }
    }
  }

  /**
   * Cancel all running operations
   */
  private async cancelAllOperations(): Promise<void> {
    const cancelPromises = Array.from(this.runningOperations.entries()).map(
      ([id, context]) => this.cancelOperation(id)
    );

    await Promise.allSettled(cancelPromises);
  }

  // ============================================================================
  // PRIVATE METHODS - ACTIVITY AND RESOURCE MONITORING
  // ============================================================================

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Monitor user activity
    if (typeof window !== "undefined") {
      const activityEvents = [
        "mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"
      ];

      const handleActivity = () => {
        this.lastActivityTime = new Date();
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true });
      });
    }
  }

  /**
   * Start activity monitoring for idle-time execution
   */
  private startActivityMonitoring(): void {
    if (!this.config.preferences.preferIdleTime) {
      return;
    }

    const checkIdleTime = () => {
      if (!this.isRunning || this.isPaused) {
        this.idleTimer = setTimeout(checkIdleTime, 5000);
        return;
      }

      const timeSinceActivity = Date.now() - this.lastActivityTime.getTime();

      if (timeSinceActivity >= this.config.preferences.idleThreshold) {
        // User has been idle, try to execute operations
        this.forceExecution().catch(error => {
          this.logger.error("Error during idle-time execution", error);
        });
      }

      this.idleTimer = setTimeout(checkIdleTime, 5000);
    };

    this.idleTimer = setTimeout(checkIdleTime, 5000);
  }

  /**
   * Initialize resource monitoring
   */
  private initializeResourceMonitoring(): void {
    if (!this.config.performance.resourceMonitoring) {
      return;
    }

    // Set baseline performance metrics
    this.performanceBaseline = {
      memory: this.getCurrentMemoryUsage(),
      cpu: this.getCurrentCPUUsage(),
    };
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    if (!this.config.performance.resourceMonitoring) {
      return;
    }

    const monitorResources = () => {
      if (!this.isRunning) {
        return;
      }

      const currentMemory = this.getCurrentMemoryUsage();
      const currentCPU = this.getCurrentCPUUsage();

      // Check if resources are too constrained for maintenance
      const memoryUsage = currentMemory / this.performanceBaseline.memory;
      const cpuUsage = currentCPU / this.performanceBaseline.cpu;

      if (memoryUsage > 0.8 || cpuUsage > 0.8) {
        this.logger.warn("High resource usage detected, postponing maintenance operations", {
          memoryUsage,
          cpuUsage,
        });
      }

      // Schedule next check
      setTimeout(monitorResources, 30000); // Check every 30 seconds
    };

    // Start monitoring after a short delay
    setTimeout(monitorResources, 5000);
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }

    return 0;
  }

  /**
   * Get current CPU usage
   */
  private getCurrentCPUUsage(): number {
    // In a browser environment, we can't directly measure CPU usage
    // This is a placeholder that would be implemented with proper monitoring
    return 50; // Assume 50% CPU usage
  }

  /**
   * Create resource monitor for operation
   */
  private createResourceMonitor(): ResourceMonitor {
    return {
      startTime: new Date(),
      initialMemory: this.getCurrentMemoryUsage(),
      peakMemory: this.getCurrentMemoryUsage(),
      initialCPU: this.getCurrentCPUUsage(),
      peakCPU: this.getCurrentCPUUsage(),
      networkBytesTransferred: 0,
      interruptions: 0,
    };
  }

  /**
   * Get time in specific timezone
   */
  private getTimeInTimezone(date: Date, timezone: string): Date {
    try {
      return new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    } catch (error) {
      return date;
    }
  }

  // ============================================================================
  // PRIVATE METHODS - PERSISTENCE
  // ============================================================================

  /**
   * Load persisted schedules from storage
   */
  private async loadPersistedSchedules(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const schedulesData = window.localStorage.getItem("maintenance_schedules");
        if (schedulesData) {
          const schedules = JSON.parse(schedulesData);
          // Restore schedules to queue
          // Implementation depends on serialization format
        }
      }
    } catch (error) {
      this.logger.warn("Failed to load persisted schedules", error);
    }
  }

  /**
   * Persist schedules to storage
   */
  private async persistSchedules(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const schedulesData = JSON.stringify(this.queue.map(entry => ({
          operation: entry.operation,
          schedule: entry.schedule,
          nextExecution: entry.nextExecution,
          retryCount: entry.retryCount,
        })));

        window.localStorage.setItem("maintenance_schedules", schedulesData);
      }
    } catch (error) {
      this.logger.warn("Failed to persist schedules", error);
    }
  }

  /**
   * Persist statistics to storage
   */
  private async persistStatistics(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const statisticsData = JSON.stringify(this.statistics);
        window.localStorage.setItem("maintenance_statistics", statisticsData);
      }
    } catch (error) {
      this.logger.warn("Failed to persist statistics", error);
    }
  }
}

// ============================================================================
// SCHEDULER FACTORY
// ============================================================================

/**
 * Create and configure a maintenance scheduler
 */
export function createMaintenanceScheduler(
  config: Partial<SchedulerConfig>,
  logger: IMaintenanceLogger,
  progressTracker: IProgressTracker,
  notificationManager: INotificationManager
): MaintenanceScheduler {
  const defaultConfig: SchedulerConfig = {
    enabled: true,
    maxConcurrentOperations: 2,
    operationTimeout: 30 * 60 * 1000, // 30 minutes
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds

    preferences: {
      preferIdleTime: true,
      idleThreshold: 5 * 60 * 1000, // 5 minutes
      quietHours: {
        start: "22:00",
        end: "06:00",
        timezone: "America/Los_Angeles",
      },
      avoidUserInterruption: true,
      batteryThreshold: 20, // 20%
      networkRequirements: {
        requireWifi: false,
        allowCellular: true,
      },
    },

    performance: {
      adaptiveScheduling: true,
      priorityBoost: 1.5,
      loadBalancing: true,
      resourceMonitoring: true,
    },
  };

  const finalConfig = { ...defaultConfig, ...config };

  return new MaintenanceScheduler(finalConfig, logger, progressTracker, notificationManager);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Default scheduler configuration for development
 */
export const developmentSchedulerConfig: Partial<SchedulerConfig> = {
  maxConcurrentOperations: 1,
  operationTimeout: 10 * 60 * 1000, // 10 minutes
  preferences: {
    preferIdleTime: false,
    idleThreshold: 30 * 1000, // 30 seconds
    avoidUserInterruption: false,
    batteryThreshold: 10,
  },
};

/**
 * Default scheduler configuration for production
 */
export const productionSchedulerConfig: Partial<SchedulerConfig> = {
  maxConcurrentOperations: 3,
  operationTimeout: 60 * 60 * 1000, // 1 hour
  preferences: {
    preferIdleTime: true,
    idleThreshold: 15 * 60 * 1000, // 15 minutes
    avoidUserInterruption: true,
    batteryThreshold: 30,
    networkRequirements: {
      requireWifi: true,
      allowCellular: false,
    },
  },
};

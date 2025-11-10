/**
 * Maintenance System Types and Interfaces
 *
 * This file defines the core types and interfaces for the comprehensive maintenance system
 * that handles data cleanup, database optimization, and performance monitoring.
 */

// ============================================================================
// MAINTENANCE OPERATION TYPES
// ============================================================================

/**
 * Types of maintenance operations that can be performed
 */
export enum MaintenanceOperationType {
  // Data cleanup operations
  CLEANUP_EXPIRED_DATA = "cleanup_expired_data",
  CLEANUP_TEMPORARY_FILES = "cleanup_temporary_files",
  CLEANUP_CACHE_ENTRIES = "cleanup_cache_entries",
  CLEANUP_ERROR_LOGS = "cleanup_error_logs",
  CLEANUP_PERFORMANCE_METRICS = "cleanup_performance_metrics",

  // Database operations
  DATABASE_OPTIMIZATION = "database_optimization",
  DATABASE_COMPACTION = "database_compaction",
  INDEX_REBUILDING = "index_rebuilding",
  DATA_INTEGRITY_CHECK = "data_integrity_check",
  DUPLICATE_CLEANUP = "duplicate_cleanup",

  // Data lifecycle operations
  DATA_ARCHIVAL = "data_archival",
  DATA_RETENTION_ENFORCEMENT = "data_retention_enforcement",
  STORAGE_MONITORING = "storage_monitoring",
  USAGE_ANALYSIS = "usage_analysis",

  // Mobile-specific operations
  MOBILE_STORAGE_OPTIMIZATION = "mobile_storage_optimization",
  BATTERY_AWARE_CLEANUP = "battery_aware_cleanup",
  NETWORK_AWARE_MAINTENANCE = "network_aware_maintenance",
  MEMORY_CLEANUP = "memory_cleanup",

  // System operations
  SYSTEM_HEALTH_CHECK = "system_health_check",
  PERFORMANCE_ANALYSIS = "performance_analysis",
  LOG_ROTATION = "log_rotation",
  CONFIGURATION_BACKUP = "configuration_backup",
}

/**
 * Maintenance operation status
 */
export enum MaintenanceOperationStatus {
  PENDING = "pending",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  SCHEDULED = "scheduled",
}

/**
 * Maintenance operation priority
 */
export enum MaintenanceOperationPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5,
}

/**
 * Maintenance operation schedule types
 */
export enum MaintenanceScheduleType {
  IMMEDIATE = "immediate",
  ONCE = "once",
  RECURRING = "recurring",
  CONDITIONAL = "conditional",
  IDLE_TIME = "idle_time",
  STARTUP = "startup",
  SHUTDOWN = "shutdown",
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Base maintenance operation interface
 */
export interface MaintenanceOperation {
  id: string;
  type: MaintenanceOperationType;
  name: string;
  description: string;
  status: MaintenanceOperationStatus;
  priority: MaintenanceOperationPriority;

  // Timing information
  createdAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // in milliseconds
  actualDuration?: number; // in milliseconds

  // Configuration
  config: Record<string, any>;
  schedule?: MaintenanceSchedule;

  // Progress tracking
  progress: {
    current: number;
    total: number;
    percentage: number;
    message: string;
    stage: string;
  };

  // Results and statistics
  results?: MaintenanceOperationResults;
  error?: Error;
  retryCount: number;
  maxRetries: number;

  // Metadata
  metadata: {
    tags: string[];
    category: string;
    createdBy: string;
    dependencies: string[]; // operation IDs that must complete first
    triggers: string[]; // operation IDs that should be triggered after completion
  };
}

/**
 * Maintenance schedule configuration
 */
export interface MaintenanceSchedule {
  id: string;
  type: MaintenanceScheduleType;
  enabled: boolean;

  // Timing configuration
  timing: {
    // For recurring schedules
    interval?: number; // in milliseconds
    cronExpression?: string;

    // For one-time schedules
    executeAt?: Date;

    // For conditional schedules
    condition?: MaintenanceCondition;

    // For idle-time schedules
    idleThreshold?: number; // milliseconds of inactivity
    maxDelay?: number; // maximum delay in milliseconds

    // For startup/shutdown schedules
    delay?: number; // delay after startup/shutdown trigger
  };

  // Execution constraints
  constraints: {
    allowedHours?: number[]; // hours of day (0-23)
    allowedDays?: number[]; // days of week (0-6, 0 = Sunday)
    maxDuration?: number; // maximum execution time in milliseconds
    requiresNetwork?: boolean;
    requiresBattery?: {
      minimum: number; // minimum battery percentage
      allowPlugged?: boolean;
    };
    requiresStorage?: {
      minimum: number; // minimum free space in bytes
    };
  };

  // Retry configuration
  retry: {
    maxAttempts: number;
    backoffStrategy: "linear" | "exponential" | "fixed";
    baseDelay: number;
    maxDelay: number;
  };
}

/**
 * Maintenance condition for conditional scheduling
 */
export interface MaintenanceCondition {
  type: "storage_threshold" | "performance_degradation" | "error_rate" | "custom";
  threshold: number;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  window?: number; // time window in milliseconds
  metric?: string; // specific metric to monitor
  evaluator?: () => Promise<boolean>; // custom condition evaluator
}

/**
 * Maintenance operation results
 */
export interface MaintenanceOperationResults {
  success: boolean;
  summary: string;
  details: Record<string, any>;

  // Statistics
  statistics: {
    itemsProcessed: number;
    itemsDeleted: number;
    itemsArchived: number;
    itemsModified: number;
    errorsEncountered: number;
    warningsGenerated: number;
  };

  // Space savings (if applicable)
  spaceReclaimed: {
    bytes: number;
    megabytes: number;
    percentage: number;
  };

  // Performance improvements (if applicable)
  performanceImprovements: {
    databaseOptimized: boolean;
    indexesRebuilt: number;
    queryTimeImprovement: number; // percentage
    loadTimeImprovement: number; // percentage
  };

  // Affected resources
  affectedResources: {
    files: string[];
    tables: string[];
    indexes: string[];
    caches: string[];
  };

  // Recommendations
  recommendations: string[];

  // Timing information
  timing: {
    startTime: Date;
    endTime: Date;
    totalDuration: number;
    stages: Array<{
      name: string;
      duration: number;
      startTime: Date;
      endTime: Date;
    }>;
  };
}

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Target data types
  targets: {
    dataType: "files" | "transcripts" | "segments" | "logs" | "metrics" | "cache" | "all";
    filters?: Record<string, any>;
  };

  // Retention rules
  rules: {
    maxAge?: number; // maximum age in milliseconds
    maxSize?: number; // maximum size in bytes
    maxCount?: number; // maximum number of items
    priorityRules?: Array<{
      priority: "high" | "medium" | "low";
      maxAge: number;
      keepCount?: number;
    }>;
  };

  // Archival settings
  archival: {
    enabled: boolean;
    archiveLocation?: string;
    compressArchives: boolean;
    archiveFormat: "json" | "binary" | "custom";
    archiveRetention: number; // how long to keep archives
  };

  // Exceptions and overrides
  exceptions: {
    preserveIds: string[];
    preservePatterns: RegExp[];
    preserveTags: string[];
    preserveCriteria: (item: any) => boolean;
  };

  // Execution settings
  execution: {
    schedule: MaintenanceSchedule;
    dryRun: boolean;
    requireConfirmation: boolean;
    notifications: {
      before: boolean;
      after: boolean;
      onFailure: boolean;
    };
  };
}

/**
 * Storage monitoring configuration
 */
export interface StorageMonitoringConfig {
  enabled: boolean;

  // Thresholds
  thresholds: {
    warning: number; // percentage
    critical: number; // percentage
    emergency: number; // percentage
  };

  // Monitoring settings
  monitoring: {
    checkInterval: number; // milliseconds
    includeExternalStorage: boolean;
    trackFileTypes: boolean;
    monitorGrowth: boolean;
  };

  // Alerts and notifications
  alerts: {
    enabled: boolean;
    channels: string[]; // notification channel IDs
    cooldown: number; // milliseconds between alerts
    escalation: {
      enabled: boolean;
      delay: number; // milliseconds
      channels: string[];
    };
  };

  // Automatic cleanup triggers
  autoCleanup: {
    enabled: boolean;
    triggerThreshold: number; // percentage
    operations: string[]; // maintenance operation IDs to run
  };
}

/**
 * Mobile-specific maintenance configuration
 */
export interface MobileMaintenanceConfig {
  enabled: boolean;

  // Battery optimization
  battery: {
    enabled: boolean;
    lowPowerMode: "disable" | "reduce" | "critical-only";
    batteryThreshold: number; // percentage
    preventDuringLowPower: boolean;
  };

  // Network optimization
  network: {
    enabled: boolean;
    requireWifiForLargeOperations: boolean;
    adaptiveQuality: boolean;
    offlineQueueing: boolean;
    batchNetworkOperations: boolean;
  };

  // Storage optimization
  storage: {
    enabled: boolean;
    aggressiveCleanup: boolean;
    preferLocalArchival: boolean;
    compressionEnabled: boolean;
  };

  // Performance optimization
  performance: {
    enabled: boolean;
    adaptiveOperations: boolean;
    maxConcurrentOperations: number;
    priorityAdjustment: boolean;
  };

  // User experience considerations
  userExperience: {
    preventInterruptions: boolean;
    requireUserInactivity: boolean;
    showProgressNotifications: boolean;
    allowCancellation: boolean;
  };
}

/**
 * Maintenance system configuration
 */
export interface MaintenanceSystemConfig {
  // Global settings
  enabled: boolean;
  debug: boolean;

  // Scheduler settings
  scheduler: {
    enabled: boolean;
    maxConcurrentOperations: number;
    defaultPriority: MaintenanceOperationPriority;
    operationTimeout: number; // milliseconds
    historyRetention: number; // days
  };

  // Data cleanup settings
  dataCleanup: {
    enabled: boolean;
    defaultPolicies: DataRetentionPolicy[];
    autoApprove: boolean;
    dryRunByDefault: boolean;
  };

  // Database maintenance settings
  databaseMaintenance: {
    enabled: boolean;
    optimizationInterval: number; // milliseconds
    integrityCheckInterval: number; // milliseconds
    compactionThreshold: number; // percentage fragmentation
  };

  // Storage monitoring
  storageMonitoring: StorageMonitoringConfig;

  // Mobile-specific settings
  mobile: MobileMaintenanceConfig;

  // Notifications and alerts
  notifications: {
    enabled: boolean;
    channels: string[];
    defaultSeverity: "info" | "warning" | "error" | "critical";
    quietHours?: {
      start: string; // HH:MM
      end: string; // HH:MM
      timezone: string;
    };
  };

  // Logging and monitoring
  logging: {
    level: "debug" | "info" | "warn" | "error";
    retainLogs: boolean;
    logOperations: boolean;
    logPerformance: boolean;
  };
}

// ============================================================================
// MAINTENANCE MANAGER INTERFACES
// ============================================================================

/**
 * Maintenance manager interface
 */
export interface IMaintenanceManager {
  // Operation management
  scheduleOperation(operation: Omit<MaintenanceOperation, "id" | "createdAt" | "progress">): Promise<string>;
  cancelOperation(operationId: string): Promise<boolean>;
  pauseOperation(operationId: string): Promise<boolean>;
  resumeOperation(operationId: string): Promise<boolean>;
  getOperation(operationId: string): Promise<MaintenanceOperation | null>;
  listOperations(filter?: MaintenanceOperationFilter): Promise<MaintenanceOperation[]>;

  // Schedule management
  createSchedule(schedule: Omit<MaintenanceSchedule, "id">): Promise<string>;
  updateSchedule(scheduleId: string, updates: Partial<MaintenanceSchedule>): Promise<boolean>;
  deleteSchedule(scheduleId: string): Promise<boolean>;
  getSchedules(): Promise<MaintenanceSchedule[]>;

  // Policy management
  createRetentionPolicy(policy: Omit<DataRetentionPolicy, "id">): Promise<string>;
  updateRetentionPolicy(policyId: string, updates: Partial<DataRetentionPolicy>): Promise<boolean>;
  deleteRetentionPolicy(policyId: string): Promise<boolean>;
  getRetentionPolicies(): Promise<DataRetentionPolicy[]>;

  // Monitoring and status
  getSystemStatus(): Promise<MaintenanceSystemStatus>;
  getStorageStatus(): Promise<StorageStatus>;
  getPerformanceMetrics(): Promise<MaintenancePerformanceMetrics>;

  // Configuration
  updateConfiguration(config: Partial<MaintenanceSystemConfig>): Promise<void>;
  getConfiguration(): Promise<MaintenanceSystemConfig>;

  // Lifecycle
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Maintenance operation filter
 */
export interface MaintenanceOperationFilter {
  type?: MaintenanceOperationType;
  status?: MaintenanceOperationStatus;
  priority?: MaintenanceOperationPriority;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

/**
 * Maintenance system status
 */
export interface MaintenanceSystemStatus {
  status: "running" | "paused" | "stopped" | "error";

  // Operations
  operations: {
    total: number;
    running: number;
    pending: number;
    completed: number;
    failed: number;
  };

  // Scheduler status
  scheduler: {
    enabled: boolean;
    activeSchedules: number;
    nextExecution?: Date;
  };

  // Resource usage
  resources: {
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
    diskUsage: number; // percentage
  };

  // Health checks
  healthChecks: {
    database: "healthy" | "warning" | "error";
    storage: "healthy" | "warning" | "error";
    scheduler: "healthy" | "warning" | "error";
  };

  // Last maintenance
  lastMaintenance?: {
    timestamp: Date;
    operations: string[];
    duration: number;
    success: boolean;
  };
}

/**
 * Storage status information
 */
export interface StorageStatus {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  percentageUsed: number;

  // Breakdown by type
  breakdown: {
    files: number;
    database: number;
    cache: number;
    logs: number;
    other: number;
  };

  // Growth trends
  trends: {
    dailyGrowth: number;
    weeklyGrowth: number;
    monthlyGrowth: number;
    projectedFullDate?: Date;
  };

  // Recommendations
  recommendations: string[];

  // Alerts
  alerts: Array<{
    level: "warning" | "critical" | "emergency";
    message: string;
    threshold: number;
    current: number;
  }>;
}

/**
 * Maintenance performance metrics
 */
export interface MaintenancePerformanceMetrics {
  // Operation metrics
  operations: {
    totalOperations: number;
    averageExecutionTime: number;
    successRate: number;
    failureRate: number;
  };

  // Database metrics
  database: {
    optimizationFrequency: number;
    averageOptimizationTime: number;
    fragmentationLevel: number;
    queryPerformance: number;
  };

  // Storage metrics
  storage: {
    cleanupFrequency: number;
    averageSpaceReclaimed: number;
    archiveEfficiency: number;
    compressionRatio: number;
  };

  // Mobile metrics
  mobile: {
    batteryImpact: number;
    dataUsage: number;
    backgroundEfficiency: number;
    userInterruptionRate: number;
  };

  // System metrics
  system: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    errorRate: number;
  };
}

// ============================================================================
// MAINTENANCE OPERATION HANDLER INTERFACES
// ============================================================================

/**
 * Maintenance operation handler interface
 */
export interface IMaintenanceOperationHandler {
  operationType: MaintenanceOperationType;
  name: string;
  description: string;

  // Operation execution
  execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults>;

  // Validation
  validate(operation: MaintenanceOperation): Promise<ValidationResult>;

  // Estimation
  estimateDuration(operation: MaintenanceOperation): Promise<number>;
  estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact>;

  // Progress tracking
  supportsProgress: boolean;
  supportsCancellation: boolean;
  supportsPauseResume: boolean;
}

/**
 * Maintenance execution context
 */
export interface MaintenanceContext {
  // System information
  systemInfo: {
    platform: string;
    architecture: string;
    nodeVersion?: string;
    browserVersion?: string;
    deviceClass?: "low" | "medium" | "high";
  };

  // Resource status
  resourceStatus: {
    availableMemory: number;
    availableStorage: number;
    batteryLevel?: number;
    networkType?: string;
    isPowerConnected?: boolean;
  };

  // Configuration
  config: MaintenanceSystemConfig;

  // Utilities
  logger: IMaintenanceLogger;
  progressTracker: IProgressTracker;
  notificationManager: INotificationManager;
  storageManager: IStorageManager;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Maintenance impact estimation
 */
export interface MaintenanceImpact {
  // Resource impact
  resources: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
    networkUsage: number; // bytes
  };

  // User experience impact
  userExperience: {
    interruptionRequired: boolean;
    performanceImpact: "none" | "low" | "medium" | "high";
    userInteractionRequired: boolean;
    estimatedDowntime: number; // milliseconds
  };

  // Data impact
  data: {
    itemsAffected: number;
    dataLossRisk: "none" | "low" | "medium" | "high";
    backupRequired: boolean;
    rollbackPossible: boolean;
  };
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Maintenance logger interface
 */
export interface IMaintenanceLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  createOperationLogger(operationId: string): IOperationLogger;
}

/**
 * Operation-specific logger interface
 */
export interface IOperationLogger {
  operationId: string;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  progress(current: number, total: number, message?: string): void;
  stage(stage: string, message?: string): void;
}

/**
 * Progress tracker interface
 */
export interface IProgressTracker {
  createTracker(operationId: string, total?: number): IProgressTrackerInstance;
  getTracker(operationId: string): IProgressTrackerInstance | null;
  removeTracker(operationId: string): void;
}

/**
 * Progress tracker instance interface
 */
export interface IProgressTrackerInstance {
  operationId: string;
  update(current: number, total?: number, message?: string): void;
  increment(amount?: number, message?: string): void;
  setStage(stage: string, message?: string): void;
  complete(message?: string): void;
  error(error: Error): void;
  getProgress(): {
    current: number;
    total: number;
    percentage: number;
    message: string;
    stage: string;
  };
}

/**
 * Notification manager interface
 */
export interface INotificationManager {
  sendNotification(notification: MaintenanceNotification): Promise<void>;
  sendProgressNotification(operation: MaintenanceOperation): Promise<void>;
  sendCompletionNotification(operation: MaintenanceOperation, results: MaintenanceOperationResults): Promise<void>;
  sendErrorNotification(operation: MaintenanceOperation, error: Error): Promise<void>;
}

/**
 * Maintenance notification
 */
export interface MaintenanceNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  channels: string[];
  priority: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

/**
 * Storage manager interface
 */
export interface IStorageManager {
  getStorageInfo(): Promise<StorageInfo>;
  cleanupStorage(type: string, options?: CleanupOptions): Promise<CleanupResult>;
  archiveData(dataType: string, items: any[], options?: ArchiveOptions): Promise<ArchiveResult>;
  getStorageUsage(): Promise<StorageUsage>;
  monitorStorage(callback: (usage: StorageUsage) => void): () => void;
}

/**
 * Storage information
 */
export interface StorageInfo {
  total: number;
  used: number;
  available: number;
  quota?: number;
  breakdown: Record<string, number>;
}

/**
 * Cleanup options
 */
export interface CleanupOptions {
  dryRun?: boolean;
  force?: boolean;
  batchSize?: number;
  filters?: Record<string, any>;
  preserveIds?: string[];
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  success: boolean;
  itemsDeleted: number;
  spaceReclaimed: number;
  errors: string[];
  warnings: string[];
}

/**
 * Archive options
 */
export interface ArchiveOptions {
  compress?: boolean;
  format?: "json" | "binary";
  location?: string;
  retention?: number;
  metadata?: Record<string, any>;
}

/**
 * Archive result
 */
export interface ArchiveResult {
  success: boolean;
  archiveId?: string;
  itemsArchived: number;
  archiveSize: number;
  compressionRatio?: number;
  errors: string[];
  warnings: string[];
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  timestamp: Date;
  total: number;
  used: number;
  available: number;
  percentage: number;
  breakdown: Record<string, number>;
  trends: {
    hourly: number[];
    daily: number[];
  };
}

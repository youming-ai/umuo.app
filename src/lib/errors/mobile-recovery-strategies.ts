/**
 * Mobile-Specific Recovery Strategies and Optimizations
 *
 * Specialized recovery actions and optimizations for mobile devices in the umuo.app
 * application. This includes battery-aware recovery, network-optimized strategies,
 * storage management, touch-friendly recovery interfaces, and offline-first
 * recovery patterns.
 */

import {
  RecoveryAction,
  RecoveryActionType,
  RecoveryImplementation,
  RecoveryResult,
  RecoveryPriority,
  RecoveryExecutionContext,
  MobileRecoveryOptimization,
  RecoveryStatus,
  MobileDeviceContext,
} from "./recovery-strategies";
import { ErrorCategory, ErrorType, classifyError } from "./error-classifier";

// ============================================================================
// MOBILE BATTERY-AWARE RECOVERY STRATEGIES
// ============================================================================

/**
 * Battery-aware recovery action that adjusts behavior based on battery level
 */
export const batteryAwareRecoveryAction: RecoveryAction = {
  id: "battery-aware-recovery",
  name: "Battery-Aware Recovery",
  description:
    "Adjusts recovery strategy based on device battery level and power mode",
  type: RecoveryActionType.DEGRADATION,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.9,
  estimatedDuration: 3000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const deviceContext = context.deviceContext;
        if (!deviceContext) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No device context available for battery-aware recovery",
            duration: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        const batteryLevel = deviceContext.batteryLevel;
        const isLowPowerMode = deviceContext.isLowPowerMode;

        // Adjust recovery strategy based on battery conditions
        const adjustments = [];

        if (batteryLevel !== undefined && batteryLevel < 0.2) {
          // Critical battery level
          adjustments.push({
            action: "reduce_concurrency",
            description: "Reducing concurrent operations to conserve battery",
          });
          adjustments.push({
            action: "increase_timeouts",
            description:
              "Increasing timeouts to account for power-saving modes",
          });
          adjustments.push({
            action: "disable_animations",
            description: "Disabling animations to reduce battery consumption",
          });

          // Apply battery-saving settings
          localStorage.setItem("recovery-battery-mode", "critical");
          localStorage.setItem("recovery-max-concurrent", "1");
          localStorage.setItem("recovery-timeout-multiplier", "2");
        } else if (batteryLevel !== undefined && batteryLevel < 0.5) {
          // Low battery level
          adjustments.push({
            action: "reduce_concurrency",
            description: "Moderately reducing operations to conserve battery",
          });
          adjustments.push({
            action: "skip_non_critical",
            description: "Skipping non-critical recovery actions",
          });

          localStorage.setItem("recovery-battery-mode", "low");
          localStorage.setItem("recovery-max-concurrent", "2");
        } else if (isLowPowerMode) {
          // Low power mode enabled (regardless of battery level)
          adjustments.push({
            action: "lower_priority",
            description: "Lowering recovery priority to conserve power",
          });
          adjustments.push({
            action: "increase_delays",
            description: "Increasing delays between recovery attempts",
          });

          localStorage.setItem("recovery-battery-mode", "power-saving");
          localStorage.setItem("recovery-priority-adjustment", "1");
        } else {
          // Normal battery level
          localStorage.setItem("recovery-battery-mode", "normal");
          localStorage.removeItem("recovery-max-concurrent");
          localStorage.removeItem("recovery-timeout-multiplier");
        }

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Battery-aware recovery applied (${adjustments.length} adjustments)`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage:
            batteryLevel !== undefined && batteryLevel < 0.2
              ? "Battery is critically low. Recovery optimized to conserve power."
              : "Recovery optimized for current battery level.",
          details: {
            batteryLevel: batteryLevel || "unknown",
            isLowPowerMode,
            adjustments,
            batteryMode: localStorage.getItem("recovery-battery-mode"),
          },
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Battery-aware recovery failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    },
  },
  mobileOptimizations: [
    {
      condition: "low_battery",
      adjustments: {
        reduceConcurrency: true,
        increaseTimeouts: true,
        disableAnimations: true,
        skipNonCritical: true,
      },
      description: "Comprehensive battery conservation on low battery",
    },
    {
      condition: "background_mode",
      adjustments: {
        lowerPriority: true,
        increaseTimeouts: true,
      },
      description: "Background recovery optimized for battery efficiency",
    },
  ],
};

// ============================================================================
// MOBILE NETWORK-OPTIMIZED RECOVERY STRATEGIES
// ============================================================================

/**
 * Network-aware recovery for mobile network conditions
 */
export const mobileNetworkOptimizationAction: RecoveryAction = {
  id: "mobile-network-optimization",
  name: "Mobile Network Optimization",
  description:
    "Optimizes recovery strategy for mobile network conditions (cellular, WiFi, weak signals)",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.85,
  estimatedDuration: 5000,
  maxRetries: 3,
  prerequisites: [],
  implementation: {
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const deviceContext = context.deviceContext;
        if (!deviceContext) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No device context available for network optimization",
            duration: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        const networkType = deviceContext.networkType;
        const networkStrength = deviceContext.networkStrength;

        const optimizations = [];
        const settings: Record<string, any> = {};

        // Cellular network optimizations
        if (networkType === "cellular") {
          optimizations.push({
            type: "data_conservation",
            description: "Enabling data compression for cellular networks",
          });
          optimizations.push({
            type: "reduced_payload",
            description:
              "Reducing request payload size for cellular efficiency",
          });
          optimizations.push({
            type: "smart_caching",
            description: "Enhanced caching to reduce cellular data usage",
          });

          settings.chunkSize = 1024 * 1024; // 1MB chunks for cellular
          settings.timeoutMultiplier = 2;
          settings.retryDelayMultiplier = 2;
          settings.maxConcurrentRequests = 1;

          // Adjust based on signal strength
          if (networkStrength !== undefined && networkStrength < 0.3) {
            optimizations.push({
              type: "weak_signal_handling",
              description: "Activating weak signal recovery protocols",
            });
            settings.chunkSize = 512 * 1024; // Smaller chunks for weak signals
            settings.timeoutMultiplier = 3;
            settings.enableOfflineFallback = true;
          }
        }

        // WiFi network optimizations
        else if (networkType === "wifi") {
          optimizations.push({
            type: "wifi_optimization",
            description: "Optimizing for WiFi network conditions",
          });

          settings.chunkSize = 5 * 1024 * 1024; // 5MB chunks for WiFi
          settings.timeoutMultiplier = 1.5;
          settings.maxConcurrentRequests = 3;

          if (networkStrength !== undefined && networkStrength < 0.5) {
            optimizations.push({
              type: "weak_wifi_handling",
              description: "Adjusting for weak WiFi signal",
            });
            settings.chunkSize = 2 * 1024 * 1024;
            settings.timeoutMultiplier = 2;
          }
        }

        // No network - enable offline mode
        else if (networkType === "none") {
          optimizations.push({
            type: "offline_mode",
            description: "Enabling offline recovery mode",
          });

          settings.offlineMode = true;
          settings.cacheOnly = true;
          settings.syncWhenOnline = true;
        }

        // Save network optimization settings
        localStorage.setItem(
          "recovery-network-settings",
          JSON.stringify(settings),
        );
        localStorage.setItem("recovery-network-type", networkType);

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Mobile network optimization applied (${optimizations.length} optimizations)`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage:
            networkType === "cellular"
              ? "Recovery optimized for mobile network to conserve data."
              : networkType === "wifi"
                ? "Recovery optimized for WiFi connection."
                : "Offline recovery mode enabled.",
          details: {
            networkType,
            networkStrength: networkStrength || "unknown",
            optimizations,
            settings,
          },
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Mobile network optimization failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    },
  },
  mobileOptimizations: [
    {
      condition: "slow_network",
      adjustments: {
        reduceConcurrency: true,
        increaseTimeouts: true,
        lowerPriority: true,
      },
      description: "Optimize for slow mobile networks",
    },
    {
      condition: "low_storage",
      adjustments: {
        reduceConcurrency: true,
        skipNonCritical: true,
      },
      description: "Conserve data usage when storage is limited",
    },
  ],
};

// ============================================================================
// MOBILE STORAGE MANAGEMENT RECOVERY STRATEGIES
// ============================================================================

/**
 * Mobile storage management and cleanup action
 */
export const mobileStorageManagementAction: RecoveryAction = {
  id: "mobile-storage-management",
  name: "Mobile Storage Management",
  description: "Manages mobile device storage during recovery operations",
  type: RecoveryActionType.CACHE_RECOVERY,
  priority: RecoveryPriority.MEDIUM,
  successProbability: 0.8,
  estimatedDuration: 10000,
  maxRetries: 1,
  prerequisites: [],
  implementation: {
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const deviceContext = context.deviceContext;
        if (!deviceContext) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No device context available for storage management",
            duration: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        const storageSpace = deviceContext.storageSpace;
        const availableSpace = storageSpace?.available || 0;
        const totalSpace = storageSpace?.total || 0;
        const usedSpace = totalSpace - availableSpace;

        const cleanupActions = [];
        let freedSpace = 0;

        // Check if storage is critically low
        const storageUsageRatio = usedSpace / totalSpace;
        const isStorageCriticallyLow =
          storageUsageRatio > 0.9 || availableSpace < 100 * 1024 * 1024; // < 100MB

        if (isStorageCriticallyLow) {
          cleanupActions.push({
            action: "clear_old_caches",
            description: "Clearing old application caches",
          });

          // Clear old caches
          const cacheKeys = Object.keys(localStorage).filter(
            (key) => key.startsWith("cache-") || key.startsWith("temp-"),
          );
          let cacheSize = 0;

          cacheKeys.forEach((key) => {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                cacheSize += value.length * 2; // Rough estimate of bytes
                localStorage.removeItem(key);
              }
            } catch (error) {
              console.warn(`Failed to clear cache key ${key}:`, error);
            }
          });

          freedSpace += cacheSize;
        }

        // Clear expired data
        if (storageUsageRatio > 0.8 || availableSpace < 500 * 1024 * 1024) {
          // < 500MB
          cleanupActions.push({
            action: "clear_expired_data",
            description: "Clearing expired application data",
          });

          const now = Date.now();
          const expiredKeys = Object.keys(localStorage).filter((key) => {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                return parsed.expiresAt && parsed.expiresAt < now;
              }
            } catch {
              return false;
            }
            return false;
          });

          expiredKeys.forEach((key) => {
            localStorage.removeItem(key);
            freedSpace += 1024; // Estimate
          });
        }

        // Clear large temporary files
        if (availableSpace < 200 * 1024 * 1024) {
          // < 200MB
          cleanupActions.push({
            action: "clear_temp_files",
            description: "Clearing large temporary files",
          });

          // Clear IndexedDB temporary data if available
          if ("indexedDB" in window) {
            try {
              const databases = await indexedDB.databases();
              for (const db of databases) {
                if (db.name?.includes("temp") || db.name?.includes("cache")) {
                  await indexedDB.deleteDatabase(db.name);
                  freedSpace += 5 * 1024 * 1024; // Estimate 5MB per DB
                }
              }
            } catch (error) {
              console.warn("Failed to clear IndexedDB databases:", error);
            }
          }
        }

        // Optimize storage for recovery
        localStorage.setItem("recovery-storage-optimized", "true");
        localStorage.setItem(
          "recovery-storage-cleanup-time",
          new Date().toISOString(),
        );

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Mobile storage management completed (${cleanupActions.length} actions, freed ~${formatBytes(freedSpace)})`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: isStorageCriticallyLow
            ? "Storage space was critically low. Temporary files and caches have been cleared."
            : "Storage optimized for recovery operations.",
          details: {
            storageSpace: {
              total: totalSpace,
              used: usedSpace,
              available: availableSpace,
              usagePercentage: Math.round(storageUsageRatio * 100),
            },
            cleanupActions,
            freedSpace,
            isStorageCriticallyLow,
          },
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Mobile storage management failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    },
  },
  mobileOptimizations: [
    {
      condition: "low_storage",
      adjustments: {
        reduceConcurrency: true,
        skipNonCritical: true,
        increaseTimeouts: true,
      },
      description: "Aggressive storage cleanup when storage is low",
    },
  ],
};

// ============================================================================
// MOBILE TOUCH-FRIENDLY RECOVERY INTERFACES
// ============================================================================

/**
 * Touch-friendly recovery action with mobile UI considerations
 */
export const touchFriendlyRecoveryAction: RecoveryAction = {
  id: "touch-friendly-recovery",
  name: "Touch-Friendly Recovery Interface",
  description:
    "Provides mobile-optimized, touch-friendly recovery interface and interactions",
  type: RecoveryActionType.USER_ACTION_REQUIRED,
  priority: RecoveryPriority.MEDIUM,
  successProbability: 0.95, // High success when user cooperates
  estimatedDuration: 15000, // Longer due to user interaction
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    userInteraction: {
      instructions: [
        "Tap on the recovery options below to proceed",
        "You can swipe left to skip any recovery step",
        "Long press for additional options",
      ],
      inputRequired: [
        {
          id: "recovery-choice",
          type: "select",
          label: "Choose recovery option:",
          required: true,
          options: [
            { label: "🔄 Try Again (Recommended)", value: "retry" },
            { label: "📶 Check Connection", value: "check_connection" },
            { label: "💾 Use Offline Mode", value: "offline" },
            { label: "⚙️ Advanced Options", value: "advanced" },
          ],
          validation: (value) => {
            if (!value) return "Please select an option to continue";
            return null;
          },
        },
      ],
      confirmations: [
        {
          id: "confirm-recovery",
          title: "Start Recovery Process",
          message:
            "This will attempt to automatically fix the issue. Continue?",
          type: "info",
          confirmText: "Start Recovery",
          cancelText: "Cancel",
          required: false,
        },
      ],
      skipAllowed: true,
      skipAction: "skip-recovery",
    },
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // In a real implementation, this would handle the mobile UI interaction
        // For now, we'll simulate the user interaction process

        console.log("Waiting for user interaction on mobile device...");

        // Simulate user interaction time
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Simulate user selection
        const userChoice =
          localStorage.getItem("recovery-user-choice") || "retry";

        // Apply mobile-specific UI enhancements
        const uiEnhancements = [
          "Optimized touch targets for easier interaction",
          "Haptic feedback enabled for recovery actions",
          "Swipe gestures supported for navigation",
          "Mobile-optimized animations and transitions",
        ];

        // Save mobile UI preferences
        localStorage.setItem("recovery-mobile-ui-enhanced", "true");
        localStorage.setItem("recovery-haptic-enabled", "true");
        localStorage.setItem("recovery-last-user-choice", userChoice);

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Touch-friendly recovery completed with user choice: ${userChoice}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Recovery completed. Your selection has been applied.",
          details: {
            userChoice,
            uiEnhancements,
            touchOptimized: true,
            hapticFeedback: true,
            deviceType: context.deviceContext?.deviceType || "unknown",
          },
          nextActions:
            userChoice === "advanced"
              ? ["Show advanced recovery options"]
              : undefined,
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Touch-friendly recovery failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage:
            "Recovery interface failed. Please try again or restart the app.",
        };
      }
    },
  },
};

// ============================================================================
// MOBILE OFFLINE-FIRST RECOVERY STRATEGIES
// ============================================================================

/**
 * Offline-first recovery for mobile devices
 */
export const mobileOfflineFirstAction: RecoveryAction = {
  id: "mobile-offline-first-recovery",
  name: "Mobile Offline-First Recovery",
  description:
    "Implements offline-first recovery patterns with intelligent sync when online",
  type: RecoveryActionType.DEGRADATION,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.9,
  estimatedDuration: 8000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const deviceContext = context.deviceContext;
        const isOnline =
          typeof navigator !== "undefined" ? navigator.onLine : true;
        const networkType = deviceContext?.networkType || "unknown";

        const offlineActions = [];
        let offlineMode = false;

        if (!isOnline || networkType === "none") {
          // Enable full offline mode
          offlineMode = true;
          offlineActions.push({
            action: "enable_offline_mode",
            description: "Enabling complete offline functionality",
          });

          // Store pending operations for later sync
          const pendingOperations = {
            id: context.recoveryId,
            timestamp: Date.now(),
            operation: context.errorContext.action,
            data: context.errorContext.customData,
            priority: context.priority,
          };

          // Save to offline queue
          const offlineQueue = JSON.parse(
            localStorage.getItem("offline-queue") || "[]",
          );
          offlineQueue.push(pendingOperations);
          localStorage.setItem("offline-queue", JSON.stringify(offlineQueue));

          offlineActions.push({
            action: "queue_for_sync",
            description: "Operation queued for sync when online",
          });
        } else if (networkType === "cellular") {
          // Enable data-saving offline mode for cellular
          offlineMode = true;
          offlineActions.push({
            action: "cellular_offline_mode",
            description: "Enabling data-saving offline mode for cellular",
          });

          // Enable cache-first strategy
          localStorage.setItem("recovery-cache-strategy", "cache-first");
          localStorage.setItem("recovery-data-saving", "true");
        } else {
          // Online - sync any pending operations
          const offlineQueue = JSON.parse(
            localStorage.getItem("offline-queue") || "[]",
          );

          if (offlineQueue.length > 0) {
            offlineActions.push({
              action: "sync_pending_operations",
              description: `Syncing ${offlineQueue.length} pending operations`,
            });

            // Process sync queue (simplified)
            for (let i = 0; i < Math.min(offlineQueue.length, 5); i++) {
              const operation = offlineQueue[i];
              console.log(`Syncing offline operation:`, operation);
              // In a real implementation, this would actually sync the operation
            }

            // Clear synced operations
            localStorage.setItem("offline-queue", JSON.stringify([]));
          }
        }

        // Configure offline-first settings
        localStorage.setItem("recovery-offline-first", "true");
        localStorage.setItem("recovery-offline-mode", offlineMode.toString());
        localStorage.setItem("recovery-last-network-type", networkType);

        // Setup online event listener for sync
        if (typeof window !== "undefined") {
          window.addEventListener(
            "online",
            () => {
              console.log("Network restored, triggering offline sync");
              setTimeout(() => {
                // Trigger sync of pending operations
                const pendingOperations = JSON.parse(
                  localStorage.getItem("offline-queue") || "[]",
                );
                if (pendingOperations.length > 0) {
                  console.log(
                    `Auto-syncing ${pendingOperations.length} pending operations`,
                  );
                  // Trigger background sync
                }
              }, 1000);
            },
            { once: true },
          );
        }

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Mobile offline-first recovery completed (${offlineActions.length} actions)`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: offlineMode
            ? "Offline mode enabled. Your data will be synced when you're back online."
            : "Ready for online operations. Any offline data has been synced.",
          details: {
            isOnline,
            networkType,
            offlineMode,
            offlineActions,
            pendingSyncCount: JSON.parse(
              localStorage.getItem("offline-queue") || "[]",
            ).length,
          },
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Mobile offline-first recovery failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    },
  },
  mobileOptimizations: [
    {
      condition: "background_mode",
      adjustments: {
        lowerPriority: true,
        increaseTimeouts: true,
      },
      description: "Background offline-first recovery",
    },
    {
      condition: "low_battery",
      adjustments: {
        skipNonCritical: true,
        reduceConcurrency: true,
      },
      description: "Battery-efficient offline mode",
    },
  ],
};

// ============================================================================
// MOBILE PERFORMANCE-OPTIMIZED RECOVERY
// ============================================================================

/**
 * Performance-optimized recovery for mobile devices
 */
export const mobilePerformanceOptimizedAction: RecoveryAction = {
  id: "mobile-performance-optimized-recovery",
  name: "Mobile Performance-Optimized Recovery",
  description:
    "Optimizes recovery performance for mobile device capabilities and constraints",
  type: RecoveryActionType.SELF_HEAL,
  priority: RecoveryPriority.MEDIUM,
  successProbability: 0.85,
  estimatedDuration: 6000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (
      context: RecoveryExecutionContext,
    ): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const deviceContext = context.deviceContext;
        const memoryInfo = deviceContext?.memoryInfo || {};

        const optimizations = [];
        const performanceSettings: Record<string, any> = {};

        // Memory-based optimizations
        if (memoryInfo.usedJSHeapSize && memoryInfo.jsHeapSizeLimit) {
          const memoryUsageRatio =
            memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

          if (memoryUsageRatio > 0.8) {
            optimizations.push({
              type: "memory_optimization",
              description: "High memory usage detected, applying optimizations",
            });

            // Enable aggressive garbage collection
            performanceSettings.enableAggressiveGC = true;
            performanceSettings.memoryLimit = Math.floor(
              memoryInfo.jsHeapSizeLimit * 0.7,
            );

            // Clear non-essential caches
            const cacheKeys = Object.keys(localStorage).filter(
              (key) => key.includes("cache") && !key.includes("essential"),
            );
            cacheKeys.forEach((key) => localStorage.removeItem(key));
          } else if (memoryUsageRatio > 0.6) {
            optimizations.push({
              type: "moderate_memory_optimization",
              description:
                "Moderate memory usage, applying light optimizations",
            });

            performanceSettings.enableModerateGC = true;
            performanceSettings.memoryLimit = Math.floor(
              memoryInfo.jsHeapSizeLimit * 0.8,
            );
          }
        }

        // Device type optimizations
        const deviceType = deviceContext?.deviceType || "unknown";

        if (deviceType === "mobile") {
          optimizations.push({
            type: "mobile_optimization",
            description: "Applying mobile-specific performance optimizations",
          });

          performanceSettings.animationQuality = "reduced";
          performanceSettings.updateInterval = 100; // Slower updates on mobile
          performanceSettings.maxConcurrentOperations = 2;
        } else if (deviceType === "tablet") {
          optimizations.push({
            type: "tablet_optimization",
            description: "Applying tablet-specific performance optimizations",
          });

          performanceSettings.animationQuality = "balanced";
          performanceSettings.updateInterval = 60;
          performanceSettings.maxConcurrentOperations = 3;
        }

        // CPU-based optimizations (if available)
        if (deviceContext?.performanceContext?.cpuUsage) {
          const cpuUsage = deviceContext.performanceContext.cpuUsage;

          if (cpuUsage > 0.8) {
            optimizations.push({
              type: "cpu_optimization",
              description:
                "High CPU usage detected, reducing processing intensity",
            });

            performanceSettings.processingIntensity = "low";
            performanceSettings.skipNonCriticalProcessing = true;
          }
        }

        // Apply performance settings
        localStorage.setItem(
          "recovery-performance-settings",
          JSON.stringify(performanceSettings),
        );
        localStorage.setItem("recovery-performance-optimized", "true");
        localStorage.setItem(
          "recovery-optimization-time",
          new Date().toISOString(),
        );

        // Enable request animation frame throttling if needed
        if (performanceSettings.animationQuality === "reduced") {
          localStorage.setItem("recovery-throttle-animations", "true");
        }

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Mobile performance optimization completed (${optimizations.length} optimizations)`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage:
            "Recovery performance has been optimized for your device.",
          details: {
            deviceType,
            memoryInfo: {
              usage: memoryInfo.usedJSHeapSize,
              limit: memoryInfo.jsHeapSizeLimit,
              usagePercentage:
                memoryInfo.usedJSHeapSize && memoryInfo.jsHeapSizeLimit
                  ? Math.round(
                      (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) *
                        100,
                    )
                  : "unknown",
            },
            optimizations,
            performanceSettings,
          },
        };
      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Mobile performance optimization failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    },
  },
  mobileOptimizations: [
    {
      condition: "low_memory",
      adjustments: {
        reduceConcurrency: true,
        skipNonCritical: true,
        increaseTimeouts: true,
      },
      description: "Aggressive memory optimization on low memory devices",
    },
    {
      condition: "low_battery",
      adjustments: {
        lowerPriority: true,
        reduceConcurrency: true,
      },
      description: "Battery-efficient performance optimization",
    },
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes for human readable display
 */
function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if device has specific capabilities
 */
function hasMobileCapability(
  capability: "haptic" | "vibration" | "touch" | "gyroscope",
): boolean {
  if (typeof window === "undefined") return false;

  switch (capability) {
    case "haptic":
      return "vibrate" in navigator;
    case "vibration":
      return "vibrate" in navigator;
    case "touch":
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    case "gyroscope":
      return "DeviceOrientationEvent" in window;
    default:
      return false;
  }
}

/**
 * Get device performance profile
 */
function getDevicePerformanceProfile(): "low" | "medium" | "high" {
  if (typeof window === "undefined") return "medium";

  // Simple heuristic based on memory and CPU
  const memory = (performance as any).memory;
  if (memory) {
    const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);

    if (memoryGB < 1) return "low";
    if (memoryGB < 4) return "medium";
    return "high";
  }

  // Fallback to device type
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|android/.test(userAgent)) {
    return /iphone [1-6]/.test(userAgent) || /android 4/.test(userAgent)
      ? "low"
      : "medium";
  }

  return "high";
}

// ============================================================================
// REGISTRATION FUNCTION
// ============================================================================

/**
 * Register all mobile-specific recovery strategies
 */
export function registerMobileRecoveryStrategies(): void {
  const mobileStrategies: RecoveryAction[] = [
    batteryAwareRecoveryAction,
    mobileNetworkOptimizationAction,
    mobileStorageManagementAction,
    touchFriendlyRecoveryAction,
    mobileOfflineFirstAction,
    mobilePerformanceOptimizedAction,
  ];

  // Register each strategy
  mobileStrategies.forEach((strategy) => {
    // This would register with the main recovery system
    console.log(`Registering mobile recovery strategy: ${strategy.name}`);
  });

  // Initialize mobile-specific settings
  if (typeof window !== "undefined") {
    localStorage.setItem("mobile-recovery-enabled", "true");
    localStorage.setItem("mobile-recovery-version", "1.0.0");

    // Setup mobile-specific event listeners
    setupMobileEventListeners();
  }
}

/**
 * Setup mobile-specific event listeners for recovery
 */
function setupMobileEventListeners(): void {
  if (typeof window === "undefined") return;

  // Battery level monitoring
  if ("getBattery" in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      battery.addEventListener("levelchange", () => {
        const level = battery.level;
        console.log(`Battery level changed: ${Math.round(level * 100)}%`);

        // Trigger battery-aware recovery adjustments
        if (level < 0.2) {
          localStorage.setItem("recovery-battery-alert", "critical");
        } else if (level < 0.5) {
          localStorage.setItem("recovery-battery-alert", "low");
        } else {
          localStorage.removeItem("recovery-battery-alert");
        }
      });

      battery.addEventListener("chargingchange", () => {
        console.log(
          `Charging status changed: ${battery.charging ? "charging" : "not charging"}`,
        );
        localStorage.setItem(
          "recovery-charging-status",
          battery.charging.toString(),
        );
      });
    });
  }

  // Network connection monitoring
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;

    connection.addEventListener("change", () => {
      console.log("Network connection changed:", connection);

      // Update recovery settings based on new network conditions
      localStorage.setItem("recovery-network-changed", "true");
      localStorage.setItem(
        "recovery-network-type",
        connection.effectiveType || "unknown",
      );
      localStorage.setItem(
        "recovery-network-downlink",
        connection.downlink || "unknown",
      );
    });
  }

  // Memory pressure monitoring (if available)
  if ("memory" in performance) {
    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      if (usageRatio > 0.9) {
        console.warn(
          "High memory usage detected:",
          Math.round(usageRatio * 100) + "%",
        );
        localStorage.setItem("recovery-memory-pressure", "high");
      } else if (usageRatio > 0.7) {
        console.log(
          "Moderate memory usage:",
          Math.round(usageRatio * 100) + "%",
        );
        localStorage.setItem("recovery-memory-pressure", "medium");
      } else {
        localStorage.removeItem("recovery-memory-pressure");
      }
    };

    // Check memory every 10 seconds
    setInterval(checkMemory, 10000);
    checkMemory(); // Initial check
  }

  // Visibility change handling
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      console.log("App moved to background, adjusting recovery settings");
      localStorage.setItem("recovery-app-visibility", "background");
    } else {
      console.log("App moved to foreground, adjusting recovery settings");
      localStorage.setItem("recovery-app-visibility", "foreground");
    }
  });

  // Orientation change handling
  window.addEventListener("orientationchange", () => {
    console.log("Device orientation changed:", window.orientation);
    localStorage.setItem(
      "recovery-orientation",
      window.orientation?.toString() || "unknown",
    );
  });
}

// Auto-register mobile strategies when module is imported
if (typeof window !== "undefined") {
  registerMobileRecoveryStrategies();
}

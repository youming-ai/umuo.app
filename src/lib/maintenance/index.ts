/**
 * Maintenance System Index
 *
 * This is the main entry point for the comprehensive maintenance system.
 * It exports all the necessary components and provides integration utilities
 * for incorporating the maintenance system into the existing umuo-app codebase.
 */

// Core types and interfaces
export * from "./types";

// Main maintenance manager
export { default as MaintenanceManager, createMaintenanceManager } from "./maintenance-manager";

// Individual maintenance handlers
export * from "./data-cleanup";
export * from "./database-maintenance";
export * from "./data-lifecycle";
export * from "./mobile-maintenance";

// Scheduling system
export {
  MaintenanceScheduler,
  createMaintenanceScheduler,
  developmentSchedulerConfig,
  productionSchedulerConfig
} from "./scheduler";

// Utility functions
export * from "./mobile-maintenance";

// Integration utilities
export { initializeMaintenanceSystem, MaintenanceSystemIntegration } from "./integration";

// Default configurations
export { createDefaultMaintenanceConfig } from "./config";

/**
 * Quick initialization function for the maintenance system
 */
export async function initializeMaintenance(
  config?: Partial<import("./types").MaintenanceSystemConfig>
) {
  const { initializeMaintenanceSystem } = await import("./integration");
  return initializeMaintenanceSystem(config);
}

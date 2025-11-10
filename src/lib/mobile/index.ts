/**
 * Simplified Mobile utilities and optimizations (Development Version)
 * Centralized exports for mobile-specific functionality
 */

// Core mobile types
export * from "@/types/mobile";

// Touch optimization
export { TouchOptimizer } from "./touch-optimizer";

// Default export
export default {
  TouchOptimizer,
};

/**
 * Vitest Configuration for Performance Testing
 * Specialized configuration for performance test execution
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Performance-specific configuration
    include: [
      'src/lib/performance/**/*.test.ts',
      'src/lib/performance/**/*.spec.ts',
      'tests/performance/**/*.test.ts',
      'tests/performance/**/*.spec.ts'
    ],

    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**'
    ],

    // Timeout configuration for performance tests
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 30000,  // 30 seconds for hooks

    // Concurrency settings
    threads: false, // Run single-threaded for consistent performance measurements
    maxConcurrency: 1, // Only one test at a time
    isolate: false, // Share context for baseline measurements

    // Output configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json'
    },

    // Global setup
    globalSetup: ['./tests/performance/global-setup.ts'],
    setupFiles: ['./tests/performance/setup.ts'],

    // Performance-specific options
    passWithNoTests: true,
    bail: 0, // Don't stop on first failure for performance tests
    retry: 1, // Allow one retry for flaky performance tests

    // Memory and performance monitoring
    logHeapUsage: true,
    isolate: false,
    gpu: false, // Disable GPU for consistent measurements

    // Coverage configuration (optional for performance tests)
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts'
      ],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0
        }
      }
    },

    // Performance test hooks
    onTestFailed: (test) => {
      if (test.name.includes('performance') || test.file.includes('performance')) {
        console.error(`\n❌ Performance Test Failed: ${test.name}`);
        console.error(`   File: ${test.file}`);
        console.error(`   Error: ${test.result?.error?.message}`);
      }
    },

    onTestPassed: (test) => {
      if (test.name.includes('performance') || test.file.includes('performance')) {
        console.log(`\n✅ Performance Test Passed: ${test.name}`);
      }
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
      '@/tests': resolve(__dirname, './tests')
    }
  },

  // Define global constants for testing
  define: {
    __TEST__: 'true',
    __PERFORMANCE_TEST__: 'true',
    'process.env.NODE_ENV': '"test"'
  },

  // Optimize for performance testing
  optimizeDeps: {
    include: [
      'vitest/globals',
      '@testing-library/jest-dom'
    ]
  }
});

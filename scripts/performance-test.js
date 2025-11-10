#!/usr/bin/env node

/**
 * Performance Test Runner Script
 * CI/CD integration for automated performance testing
 */

const {
  performanceTestRunner,
} = require("../src/lib/performance/performance-test-runner");
const {
  coreWebVitalsTests,
} = require("../src/lib/performance/automated-test-suite");
const {
  transcriptionTests,
} = require("../src/lib/performance/automated-test-suite");
const {
  mobilePerformanceTests,
} = require("../src/lib/performance/automated-test-suite");
const {
  uiResponsivenessTests,
} = require("../src/lib/performance/automated-test-suite");
const {
  networkPerformanceTests,
} = require("../src/lib/performance/automated-test-suite");

// Node.js modules for CI/CD integration
const fs = require("fs");
const path = require("path");

class CIPerformanceTestRunner {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 300000, // 5 minutes default
      outputDir: options.outputDir || "./performance-reports",
      failOnError: options.failOnError !== false,
      generateReport: options.generateReport !== false,
      uploadResults: options.uploadResults || false,
      thresholds: options.thresholds || {},
      ...options,
    };

    this.setupEnvironment();
  }

  /**
   * Setup test environment for CI/CD
   */
  setupEnvironment() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Set performance monitoring for CI environment
    if (typeof process !== "undefined" && process.env) {
      process.env.NODE_ENV = "test";
      process.env.PERFORMANCE_TESTING = "true";
    }

    console.log("🔧 Performance test environment setup complete");
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    const startTime = Date.now();

    try {
      console.log("🚀 Starting comprehensive performance test suite...");

      // Register test suites
      this.registerTestSuites();

      // Run all test suites
      const reports = await performanceTestRunner.runAllTestSuites();

      // Process results
      const results = this.processResults(reports);

      // Generate reports
      if (this.options.generateReport) {
        await this.generateReports(reports, results);
      }

      // Determine exit code
      const shouldFail = this.shouldFailBuild(results);

      const duration = Date.now() - startTime;
      console.log(`✅ Performance testing completed in ${duration}ms`);

      if (shouldFail && this.options.failOnError) {
        console.error(
          "❌ Performance test failures detected - build will fail",
        );
        process.exit(1);
      } else if (shouldFail) {
        console.warn(
          "⚠️ Performance test failures detected - build continues due to failOnError=false",
        );
      } else {
        console.log("✅ All performance tests passed");
      }

      return results;
    } catch (error) {
      console.error("💥 Performance test runner failed:", error);
      if (this.options.failOnError) {
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * Register all test suites
   */
  registerTestSuites() {
    // Core Web Vitals Suite
    performanceTestRunner.registerTestSuite({
      name: "core-web-vitals",
      description: "Core Web Vitals performance testing",
      tests: coreWebVitalsTests,
      thresholds: this.options.thresholds.coreWebVitals || {},
      setup: async () => {
        console.log("📊 Setting up Core Web Vitals tests...");
        // Setup for web vitals testing
      },
      teardown: async () => {
        console.log("🧹 Cleaning up Core Web Vitals tests...");
        // Cleanup after web vitals testing
      },
    });

    // Transcription Performance Suite
    performanceTestRunner.registerTestSuite({
      name: "transcription-performance",
      description: "Transcription service performance testing",
      tests: transcriptionTests,
      thresholds: this.options.thresholds.transcription || {},
      setup: async () => {
        console.log("🎙️ Setting up Transcription performance tests...");
        // Setup for transcription testing
      },
      teardown: async () => {
        console.log("🧹 Cleaning up Transcription performance tests...");
        // Cleanup after transcription testing
      },
    });

    // Mobile Performance Suite
    performanceTestRunner.registerTestSuite({
      name: "mobile-performance",
      description: "Mobile device performance testing",
      tests: mobilePerformanceTests,
      thresholds: this.options.thresholds.mobile || {},
      setup: async () => {
        console.log("📱 Setting up Mobile performance tests...");
        // Setup for mobile testing
      },
      teardown: async () => {
        console.log("🧹 Cleaning up Mobile performance tests...");
        // Cleanup after mobile testing
      },
    });

    // UI Responsiveness Suite
    performanceTestRunner.registerTestSuite({
      name: "ui-responsiveness",
      description: "UI responsiveness and interaction performance",
      tests: uiResponsivenessTests,
      thresholds: this.options.thresholds.ui || {},
      setup: async () => {
        console.log("🖥️ Setting up UI responsiveness tests...");
        // Setup for UI testing
      },
      teardown: async () => {
        console.log("🧹 Cleaning up UI responsiveness tests...");
        // Cleanup after UI testing
      },
    });

    // Network Performance Suite
    performanceTestRunner.registerTestSuite({
      name: "network-performance",
      description: "Network and API performance testing",
      tests: networkPerformanceTests,
      thresholds: this.options.thresholds.network || {},
      setup: async () => {
        console.log("🌐 Setting up Network performance tests...");
        // Setup for network testing
      },
      teardown: async () => {
        console.log("🧹 Cleaning up Network performance tests...");
        // Cleanup after network testing
      },
    });

    console.log(
      `📋 Registered ${performanceTestRunner.testSuites.size} test suites`,
    );
  }

  /**
   * Process test results
   */
  processResults(reports) {
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalFailures: 0,
      regressions: [],
      summary: {},
      reports,
    };

    reports.forEach((report) => {
      results.totalTests += report.summary.total;
      results.passedTests += report.summary.passed;
      results.failedTests += report.summary.failed;
      results.criticalFailures += report.summary.criticalFailures;

      // Collect regressions
      results.regressions.push(
        ...report.regressionAnalysis.detectedRegressions,
      );

      // Add to summary
      results.summary[report.suiteName] = {
        passRate: report.summary.passRate,
        duration: report.duration,
        critical: report.summary.criticalFailures > 0,
      };
    });

    results.passRate =
      results.totalTests > 0
        ? (results.passedTests / results.totalTests) * 100
        : 0;

    return results;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(reports, results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // JSON Report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: results,
      reports: reports.map((r) => ({
        suiteName: r.suiteName,
        summary: r.summary,
        trends: r.trends,
        recommendations: r.recommendations,
        regressionAnalysis: r.regressionAnalysis,
      })),
    };

    const jsonPath = path.join(
      this.options.outputDir,
      `performance-report-${timestamp}.json`,
    );
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📄 JSON report saved to: ${jsonPath}`);

    // Markdown Report
    const markdownReport = this.generateMarkdownReport(results, reports);
    const mdPath = path.join(
      this.options.outputDir,
      `performance-report-${timestamp}.md`,
    );
    fs.writeFileSync(mdPath, markdownReport);
    console.log(`📝 Markdown report saved to: ${mdPath}`);

    // JUnit XML for CI integration
    const junitReport = this.generateJUnitReport(reports);
    const junitPath = path.join(
      this.options.outputDir,
      `performance-junit-${timestamp}.xml`,
    );
    fs.writeFileSync(junitPath, junitReport);
    console.log(`🧪 JUnit XML report saved to: ${junitPath}`);

    // Performance metrics file for dashboards
    const metricsReport = this.generateMetricsReport(reports);
    const metricsPath = path.join(
      this.options.outputDir,
      `performance-metrics-${timestamp}.json`,
    );
    fs.writeFileSync(metricsPath, JSON.stringify(metricsReport, null, 2));
    console.log(`📊 Metrics report saved to: ${metricsPath}`);

    // Latest reports (for easy access)
    fs.copyFileSync(
      jsonPath,
      path.join(this.options.outputDir, "latest-performance-report.json"),
    );
    fs.copyFileSync(
      mdPath,
      path.join(this.options.outputDir, "latest-performance-report.md"),
    );
    fs.copyFileSync(
      metricsPath,
      path.join(this.options.outputDir, "latest-performance-metrics.json"),
    );
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(results, reports) {
    let markdown = `# Performance Test Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${results.totalTests}\n`;
    markdown += `- **Passed:** ${results.passedTests}\n`;
    markdown += `- **Failed:** ${results.failedTests}\n`;
    markdown += `- **Pass Rate:** ${results.passRate.toFixed(2)}%\n`;
    markdown += `- **Critical Failures:** ${results.criticalFailures}\n`;
    markdown += `- **Regressions Detected:** ${results.regressions.length}\n\n`;

    // Test suite breakdown
    markdown += `## Test Suite Results\n\n`;
    for (const [suiteName, suiteSummary] of Object.entries(results.summary)) {
      const status = suiteSummary.critical ? "❌" : "✅";
      markdown += `### ${suiteName} ${status}\n`;
      markdown += `- Pass Rate: ${suiteSummary.passRate.toFixed(2)}%\n`;
      markdown += `- Duration: ${(suiteSummary.duration / 1000).toFixed(2)}s\n`;
      markdown += `- Critical Issues: ${suiteSummary.critical ? "Yes" : "No"}\n\n`;
    }

    // Regressions section
    if (results.regressions.length > 0) {
      markdown += `## Performance Regressions\n\n`;
      results.regressions.forEach((regression) => {
        const severityEmoji =
          {
            critical: "🚨",
            major: "⚠️",
            moderate: "⚡",
            minor: "ℹ️",
          }[regression.severity] || "ℹ️";

        markdown += `### ${severityEmoji} ${regression.testName} - ${regression.metric}\n`;
        markdown += `- **Severity:** ${regression.severity}\n`;
        markdown += `- **Current Value:** ${regression.currentValue}\n`;
        markdown += `- **Baseline Value:** ${regression.baselineValue}\n`;
        markdown += `- **Degradation:** ${regression.degradationPercent.toFixed(2)}%\n\n`;
      });
    }

    // Recommendations section
    const allRecommendations = reports.flatMap((r) => r.recommendations);
    if (allRecommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      allRecommendations.slice(0, 10).forEach((rec) => {
        markdown += `- ${rec}\n`;
      });
      if (allRecommendations.length > 10) {
        markdown += `- ... and ${allRecommendations.length - 10} more recommendations\n`;
      }
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Generate JUnit XML report for CI systems
   */
  generateJUnitReport(reports) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n`;

    let totalTests = 0;
    let totalFailures = 0;
    let totalErrors = 0;
    let totalTime = 0;

    reports.forEach((report) => {
      xml += `  <testsuite name="${report.suiteName}" tests="${report.summary.total}" failures="${report.summary.failed}" errors="${report.summary.criticalFailures}" time="${report.duration / 1000}">\n`;

      report.results.forEach((result) => {
        totalTests++;
        totalTime += result.duration / 1000;

        if (!result.passed) {
          totalFailures++;
          if (result.error) {
            totalErrors++;
          }
        }

        xml += `    <testcase name="${result.testName}" classname="${report.suiteName}" time="${result.duration / 1000}">\n`;

        if (!result.passed) {
          if (result.error) {
            xml += `      <error message="${result.error.message}"><![CDATA[${result.error.stack}]]></error>\n`;
          } else {
            xml += `      <failure message="Performance threshold exceeded"><![CDATA[Metrics: ${JSON.stringify(result.metrics, null, 2)}]]></failure>\n`;
          }
        }

        xml += `    </testcase>\n`;
      });

      xml += `  </testsuite>\n`;
    });

    xml += `</testsuites>\n`;
    return xml;
  }

  /**
   * Generate metrics report for dashboards
   */
  generateMetricsReport(reports) {
    const metrics = {
      timestamp: new Date().toISOString(),
      suites: {},
      trends: {},
      regressions: [],
      overall: {},
    };

    reports.forEach((report) => {
      metrics.suites[report.suiteName] = {
        summary: report.summary,
        trends: report.trends,
        recommendations: report.recommendations,
      };

      // Extract key metrics for trends
      Object.values(report.results).forEach((result) => {
        Object.entries(result.metrics).forEach(([metric, value]) => {
          if (!metrics.trends[metric]) {
            metrics.trends[metric] = [];
          }
          metrics.trends[metric].push({
            suite: report.suiteName,
            test: result.testName,
            value,
            timestamp: report.timestamp,
          });
        });
      });

      // Collect regressions
      metrics.regressions.push(
        ...report.regressionAnalysis.detectedRegressions,
      );
    });

    // Overall metrics
    const allResults = reports.flatMap((r) => r.results);
    metrics.overall = {
      totalTests: allResults.length,
      passedTests: allResults.filter((r) => r.passed).length,
      failedTests: allResults.filter((r) => !r.passed).length,
      passRate:
        (allResults.filter((r) => r.passed).length / allResults.length) * 100,
      totalRegressions: metrics.regressions.length,
      criticalRegressions: metrics.regressions.filter(
        (r) => r.severity === "critical",
      ).length,
    };

    return metrics;
  }

  /**
   * Determine if build should fail
   */
  shouldFailBuild(results) {
    // Fail if pass rate is below threshold
    const passRateThreshold = this.options.passRateThreshold || 80;
    if (results.passRate < passRateThreshold) {
      console.warn(
        `Pass rate (${results.passRate.toFixed(2)}%) below threshold (${passRateThreshold}%)`,
      );
      return true;
    }

    // Fail if there are critical failures
    if (results.criticalFailures > 0) {
      console.warn(`Critical failures detected: ${results.criticalFailures}`);
      return true;
    }

    // Fail if there are critical regressions
    const criticalRegressions = results.regressions.filter(
      (r) => r.severity === "critical",
    );
    if (criticalRegressions.length > 0) {
      console.warn(
        `Critical regressions detected: ${criticalRegressions.length}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Upload results to external services (if configured)
   */
  async uploadResults(results) {
    if (!this.options.uploadResults) {
      return;
    }

    // Example: Upload to performance monitoring service
    if (process.env.PERFORMANCE_SERVICE_URL) {
      try {
        const response = await fetch(process.env.PERFORMANCE_SERVICE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PERFORMANCE_SERVICE_TOKEN}`,
          },
          body: JSON.stringify(results),
        });

        if (response.ok) {
          console.log("📤 Performance results uploaded to external service");
        } else {
          console.warn(
            "⚠️ Failed to upload performance results:",
            response.statusText,
          );
        }
      } catch (error) {
        console.warn("⚠️ Error uploading performance results:", error);
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++; // Skip the value
      } else {
        options[key] = true;
      }
    }
  }

  const runner = new CIPerformanceTestRunner(options);
  runner.runAllTests().catch(console.error);
}

module.exports = { CIPerformanceTestRunner };

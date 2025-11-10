/**
 * Additional components for Error Logging and Monitoring System (T064)
 *
 * This file contains additional components for the error logging system to keep the main file
 * focused on core functionality. Components include:
 * - AlertManager for configurable alerting and notifications
 * - MobileLoggerOptimizer for battery and network-aware logging
 * - PrivacyManager for PII detection and redaction
 * - DeveloperTools for log inspection and debugging utilities
 */

import {
  StructuredLog,
  LogLevel,
  AlertRule,
  NotificationChannel,
  PrivacyConfig,
  MobileOptimizationConfig,
  DevToolsConfig,
} from "./error-logging";
import { ErrorType, ErrorSeverity, ErrorCategory } from "@/types/api/errors";

// ============================================================================
// ALERT MANAGER
// ============================================================================

/**
 * AlertManager handles alert generation and notification
 */
export class AlertManager {
  private config: any;
  private recentAlerts: Map<string, number> = new Map(); // Track recent alerts to prevent fatigue
  private alertHistory: Alert[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  async initialize(config: any): Promise<void> {
    this.config = config;

    if (config.cooldown > 0) {
      this.startCleanupTimer();
    }

    console.log("AlertManager initialized");
  }

  async processLog(log: StructuredLog): Promise<void> {
    if (!this.config.enabled) return;

    // Check alert rules
    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateAlertRule(rule, log);
        if (shouldAlert) {
          await this.triggerAlert(rule, log);
        }
      } catch (error) {
        console.error("Failed to evaluate alert rule:", error);
      }
    }
  }

  private async evaluateAlertRule(
    rule: AlertRule,
    log: StructuredLog,
  ): Promise<boolean> {
    const { conditions } = rule;

    // Check error types
    if (conditions.errorTypes && log.error?.type) {
      if (!conditions.errorTypes.includes(log.error.type)) {
        return false;
      }
    }

    // Check error severities
    if (conditions.errorSeverities && log.error?.severity) {
      if (!conditions.errorSeverities.includes(log.error.severity)) {
        return false;
      }
    }

    // Check error categories
    if (conditions.errorCategories) {
      if (!conditions.errorCategories.includes(log.category)) {
        return false;
      }
    }

    // Check threshold conditions
    const thresholdMet = await this.checkThresholdCondition(rule, log);
    if (!thresholdMet) {
      return false;
    }

    // Check custom condition
    if (conditions.custom) {
      return conditions.custom([log]);
    }

    return true;
  }

  private async checkThresholdCondition(
    rule: AlertRule,
    log: StructuredLog,
  ): Promise<boolean> {
    const { threshold } = rule.conditions;

    // Get recent logs within the time window
    const now = Date.now();
    const windowStart = now - threshold.timeWindow;

    // For simple threshold check, we'd need access to recent logs
    // This is a simplified implementation
    const recentLogs = this.alertHistory.filter(
      (alert) => now - alert.timestamp.getTime() < threshold.timeWindow,
    );

    const count = recentLogs.length + 1; // +1 for current log

    switch (threshold.operator) {
      case "gt":
        return count > threshold.count;
      case "gte":
        return count >= threshold.count;
      case "lt":
        return count < threshold.count;
      case "lte":
        return count <= threshold.count;
      case "eq":
        return count === threshold.count;
      default:
        return false;
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    log: StructuredLog,
  ): Promise<void> {
    const alertKey = `${rule.id}_${log.error?.type || log.category}`;

    // Check cooldown to prevent alert fatigue
    const lastAlertTime = this.recentAlerts.get(alertKey);
    if (lastAlertTime && Date.now() - lastAlertTime < this.config.cooldown) {
      return;
    }

    // Create alert
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.alert.severity,
      title: this.interpolateTemplate(rule.alert.title, log),
      message: this.interpolateTemplate(rule.alert.message, log),
      timestamp: new Date(),
      logId: log.id,
      context: log.context,
      error: log.error,
      channels: rule.alert.channels,
    };

    // Record alert
    this.alertHistory.push(alert);
    this.recentAlerts.set(alertKey, Date.now());

    // Send notifications
    await this.sendNotifications(alert, rule.alert.channels);

    console.log(`Alert triggered: ${alert.title}`);
  }

  private async sendNotifications(
    alert: Alert,
    channels: NotificationChannel[],
  ): Promise<void> {
    const sendPromises = channels
      .filter((channel) => channel.enabled)
      .map((channel) => this.sendNotification(alert, channel));

    await Promise.allSettled(sendPromises);
  }

  private async sendNotification(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<void> {
    try {
      switch (channel.type) {
        case "email":
          await this.sendEmailNotification(alert, channel);
          break;
        case "slack":
          await this.sendSlackNotification(alert, channel);
          break;
        case "webhook":
          await this.sendWebhookNotification(alert, channel);
          break;
        case "console":
          this.sendConsoleNotification(alert, channel);
          break;
        case "sms":
          // SMS notification would require additional service integration
          console.warn("SMS notifications not implemented");
          break;
        case "push":
          // Push notifications would require additional service integration
          console.warn("Push notifications not implemented");
          break;
        default:
          console.warn(`Unknown notification channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send ${channel.type} notification:`, error);
    }
  }

  private async sendEmailNotification(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    const payload = {
      to: channel.config.to,
      subject: this.interpolateTemplate(
        channel.config.subject || alert.title,
        alert,
      ),
      text: alert.message,
      html: this.generateHtmlEmail(alert),
    };

    console.log("Email notification payload:", payload);
    // Implementation would depend on email service
  }

  private async sendSlackNotification(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<void> {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) return;

    const payload = {
      channel: channel.config.channel || "#alerts",
      username: channel.config.username || "ErrorLogger",
      text: alert.title,
      attachments: [
        {
          color: this.getSlackColor(alert.severity),
          fields: [
            {
              title: "Message",
              value: alert.message,
              short: false,
            },
            {
              title: "Severity",
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: "Time",
              value: alert.timestamp.toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  private async sendWebhookNotification(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<void> {
    const endpoint = channel.config.url;
    if (!endpoint) return;

    const payload = channel.templates?.payload || {
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        logId: alert.logId,
      },
    };

    const response = await fetch(endpoint, {
      method: channel.config.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...channel.config.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  }

  private sendConsoleNotification(
    alert: Alert,
    channel: NotificationChannel,
  ): void {
    const format = channel.config.format || "json";
    const colorize = channel.config.colorize !== false;

    if (format === "json") {
      console.log(JSON.stringify(alert, null, 2));
    } else {
      const colors = {
        low: colorize ? "\x1b[36m" : "", // Cyan
        medium: colorize ? "\x1b[33m" : "", // Yellow
        high: colorize ? "\x1b[31m" : "", // Red
        critical: colorize ? "\x1b[35m" : "", // Magenta
        reset: colorize ? "\x1b[0m" : "", // Reset
      };

      const color = colors[alert.severity as keyof typeof colors] || "";
      const reset = colors.reset || "";

      console.log(`${color}🚨 ALERT [${alert.severity.toUpperCase()}]${reset}`);
      console.log(`${color}Title: ${alert.title}${reset}`);
      console.log(`${color}Message: ${alert.message}${reset}`);
      console.log(`${color}Time: ${alert.timestamp.toISOString()}${reset}`);
      console.log(`${color}Log ID: ${alert.logId}${reset}`);
      console.log("---");
    }
  }

  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const keys = key.split(".");
      let value = data;

      for (const k of keys) {
        value = value?.[k];
      }

      return value !== undefined ? String(value) : match;
    });
  }

  private generateHtmlEmail(alert: Alert): string {
    return `
      <html>
        <body>
          <h2 style="color: ${this.getAlertColor(alert.severity)}">
            🚨 ${alert.title}
          </h2>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
          <p><strong>Log ID:</strong> ${alert.logId}</p>
          <p><strong>Message:</strong> ${alert.message}</p>

          ${
            alert.error
              ? `
          <h3>Error Details:</h3>
          <p><strong>Type:</strong> ${alert.error.type}</p>
          <p><strong>Name:</strong> ${alert.error.name}</p>
          <p><strong>Message:</strong> ${alert.error.message}</p>
          ${alert.error.code ? `<p><strong>Code:</strong> ${alert.error.code}</p>` : ""}
          `
              : ""
          }

          ${
            alert.context
              ? `
          <h3>Context:</h3>
          <pre>${JSON.stringify(alert.context, null, 2)}</pre>
          `
              : ""
          }
        </body>
      </html>
    `;
  }

  private getSlackColor(severity: string): string {
    const colors = {
      low: "good", // Green
      medium: "warning", // Yellow
      high: "danger", // Red
      critical: "#8b0000", // Dark red
    };
    return colors[severity as keyof typeof colors] || "warning";
  }

  private getAlertColor(severity: string): string {
    const colors = {
      low: "#36a64f", // Green
      medium: "#ff9500", // Orange
      high: "#ff0000", // Red
      critical: "#8b0000", // Dark red
    };
    return colors[severity as keyof typeof colors] || "#ff9500";
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupRecentAlerts().catch(console.error);
    }, this.config.cooldown);
  }

  private async cleanupRecentAlerts(): Promise<void> {
    const now = Date.now();
    const threshold = now - this.config.cooldown;

    for (const [key, timestamp] of this.recentAlerts.entries()) {
      if (timestamp < threshold) {
        this.recentAlerts.delete(key);
      }
    }
  }

  async flush(): Promise<void> {
    // No pending operations for alerts
  }

  updateConfiguration(config: any): void {
    this.config = { ...this.config, ...config };
  }

  getAlertHistory(): Alert[] {
    return [...this.alertHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }
}

// ============================================================================
// MOBILE LOGGER OPTIMIZER
// ============================================================================

/**
 * MobileLoggerOptimizer provides mobile-specific optimizations for logging
 */
export class MobileLoggerOptimizer {
  private config?: MobileOptimizationConfig;
  private deviceInfo?: MobileDeviceInfo;
  private batteryLevel: number = 100;
  private networkType: string = "unknown";
  private isLowPowerMode: boolean = false;
  private offlineBuffer: StructuredLog[] = [];
  private networkStatus: boolean = true;

  async initialize(config: MobileOptimizationConfig): Promise<void> {
    this.config = config;

    if (config.enabled) {
      await this.detectDeviceInfo();
      await this.setupNetworkMonitoring();
      await this.setupBatteryMonitoring();
    }

    console.log("MobileLoggerOptimizer initialized");
  }

  async processLog(log: StructuredLog): Promise<StructuredLog> {
    if (!this.config?.enabled) {
      return log;
    }

    let processedLog = { ...log };

    // Apply battery optimizations
    processedLog = await this.applyBatteryOptimizations(processedLog);

    // Apply network optimizations
    processedLog = await this.applyNetworkOptimizations(processedLog);

    // Apply performance optimizations
    processedLog = await this.applyPerformanceOptimizations(processedLog);

    // Add mobile context
    processedLog.mobile = await this.getMobileContext();

    return processedLog;
  }

  private async applyBatteryOptimizations(
    log: StructuredLog,
  ): Promise<StructuredLog> {
    const batteryConfig = this.config?.batteryOptimization;
    if (!batteryConfig?.enabled) {
      return log;
    }

    // Check if we should reduce logging based on battery level
    if (this.batteryLevel < batteryConfig.batteryThreshold) {
      switch (batteryConfig.lowPowerMode) {
        case "disable":
          // Skip non-critical logs
          if (log.level < LogLevel.ERROR) {
            log.level = LogLevel.DEBUG; // Mark as filtered
          }
          break;

        case "reduce":
          // Reduce log level for less important logs
          if (log.level === LogLevel.INFO) {
            log.level = LogLevel.WARN;
          } else if (log.level === LogLevel.DEBUG) {
            log.level = LogLevel.INFO;
          }
          break;

        case "critical-only":
          // Only allow critical and error logs
          if (log.level < LogLevel.ERROR) {
            log.level = LogLevel.DEBUG; // Mark as filtered
          }
          break;
      }
    }

    return log;
  }

  private async applyNetworkOptimizations(
    log: StructuredLog,
  ): Promise<StructuredLog> {
    const networkConfig = this.config?.networkOptimization;
    if (!networkConfig?.enabled) {
      return log;
    }

    // If offline, buffer the log
    if (!this.networkStatus && networkConfig.offlineBuffering) {
      this.offlineBuffer.push(log);
      // Mark log as buffered
      log.metadata = {
        ...log.metadata,
        buffered: true,
        offline: true,
      };
    }

    // Apply quality reduction based on network type
    const qualityMode =
      networkConfig.networkTypes[
        this.networkType as keyof typeof networkConfig.networkTypes
      ] || "minimal";

    switch (qualityMode) {
      case "minimal":
        // Remove unnecessary fields
        delete log.performance;
        delete log.mobile;
        if (log.metadata) {
          // Keep only essential metadata
          const essential = {
            timestamp: log.metadata.timestamp,
          };
          log.metadata = essential;
        }
        break;

      case "reduced":
        // Remove some fields
        delete log.performance;
        break;

      case "full":
        // Keep all fields
        break;
    }

    return log;
  }

  private async applyPerformanceOptimizations(
    log: StructuredLog,
  ): Promise<StructuredLog> {
    const perfConfig = this.config?.performanceOptimization;
    if (!perfConfig?.enabled) {
      return log;
    }

    // Limit stack trace length for performance
    if (log.error?.stack && perfConfig.maxProcessingTime > 0) {
      const lines = log.error.stack.split("\n");
      if (lines.length > 10) {
        log.error.stack = lines.slice(0, 10).join("\n") + "\n... (truncated)";
      }
    }

    return log;
  }

  private async detectDeviceInfo(): Promise<void> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    this.deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
      },
      device: this.detectDeviceType(navigator.userAgent),
      browser: this.detectBrowser(navigator.userAgent),
      os: this.detectOS(navigator.userAgent),
    };
  }

  private detectDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
    const mobileRegex =
      /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;

    if (tabletRegex.test(userAgent)) {
      return "tablet";
    } else if (mobileRegex.test(userAgent)) {
      return "mobile";
    } else {
      return "desktop";
    }
  }

  private detectBrowser(userAgent: string): string {
    const browsers = {
      Chrome: /Chrome/i,
      Firefox: /Firefox/i,
      Safari: /Safari/i,
      Edge: /Edge/i,
      Opera: /Opera/i,
      IE: /MSIE|Trident/i,
    };

    for (const [name, regex] of Object.entries(browsers)) {
      if (regex.test(userAgent)) {
        return name;
      }
    }

    return "Unknown";
  }

  private detectOS(userAgent: string): string {
    const oses = {
      Windows: /Windows/i,
      macOS: /Mac/i,
      iOS: /iPhone|iPad|iPod/i,
      Android: /Android/i,
      Linux: /Linux/i,
    };

    for (const [name, regex] of Object.entries(oses)) {
      if (regex.test(userAgent)) {
        return name;
      }
    }

    return "Unknown";
  }

  private async setupNetworkMonitoring(): Promise<void> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Initial network status
    this.networkStatus = navigator.onLine;

    // Listen for network changes
    const updateNetworkStatus = () => {
      this.networkStatus = navigator.onLine;

      // If coming back online, flush buffered logs
      if (this.networkStatus && this.offlineBuffer.length > 0) {
        this.flushOfflineBuffer().catch(console.error);
      }
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Get connection type if available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.networkType = connection.effectiveType || "unknown";

      connection.addEventListener("change", () => {
        this.networkType = connection.effectiveType || "unknown";
      });
    }
  }

  private async setupBatteryMonitoring(): Promise<void> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Get battery information if available
    if ("getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery();

        this.batteryLevel = battery.level * 100;
        this.isLowPowerMode = battery.level < 0.2;

        battery.addEventListener("levelchange", () => {
          this.batteryLevel = battery.level * 100;
          this.isLowPowerMode = battery.level < 0.2;
        });
      } catch (error) {
        console.warn("Battery API not available:", error);
      }
    }
  }

  private async getMobileContext(): Promise<StructuredLog["mobile"]> {
    if (!this.deviceInfo) {
      return undefined;
    }

    return {
      platform: this.deviceInfo.os,
      deviceModel: this.deviceInfo.device,
      osVersion: this.deviceInfo.os,
      appVersion: process.env.npm_package_version || "1.0.0",
      deviceClass: this.determineDeviceClass(),
      screenResolution: `${this.deviceInfo.screen.width}x${this.deviceInfo.screen.height}`,
      connectionQuality: this.determineConnectionQuality(),
      isPWA: this.isPWA(),
      isStandalone: this.isStandalone(),
    };
  }

  private determineDeviceClass(): "low" | "medium" | "high" {
    if (!this.deviceInfo) {
      return "medium";
    }

    // Simple heuristic based on screen resolution and device type
    const pixelCount =
      this.deviceInfo.screen.width * this.deviceInfo.screen.height;

    if (this.deviceInfo.device === "mobile") {
      return pixelCount < 500000 ? "low" : "medium";
    } else if (this.deviceInfo.device === "tablet") {
      return pixelCount < 1000000 ? "medium" : "high";
    } else {
      return pixelCount < 1920 * 1080 ? "medium" : "high";
    }
  }

  private determineConnectionQuality(): "poor" | "fair" | "good" | "excellent" {
    if (this.networkType === "slow-2g" || this.networkType === "2g") {
      return "poor";
    } else if (this.networkType === "3g") {
      return "fair";
    } else if (this.networkType === "4g") {
      return "good";
    } else if (this.networkType === "wifi" || this.networkType === "ethernet") {
      return "excellent";
    } else {
      return "fair";
    }
  }

  private isPWA(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      "serviceWorker" in navigator ||
      window.matchMedia("(display-mode: standalone)").matches
    );
  }

  private isStandalone(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as any).standalone)
    );
  }

  private async flushOfflineBuffer(): Promise<void> {
    if (this.offlineBuffer.length === 0) {
      return;
    }

    const bufferedLogs = [...this.offlineBuffer];
    this.offlineBuffer = [];

    // Send buffered logs to monitoring services
    // This would integrate with the main ErrorLogger
    console.log(`Flushing ${bufferedLogs.length} buffered logs`);
  }
}

// ============================================================================
// MOBILE DEVICE INFO INTERFACE
// ============================================================================

interface MobileDeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
  };
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
}

// ============================================================================
// ALERT INTERFACES
// ============================================================================

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  logId: string;
  context?: any;
  error?: any;
  channels: NotificationChannel[];
}

// ============================================================================
// PRIVACY MANAGER
// ============================================================================

/**
 * PrivacyManager handles PII detection and redaction for privacy compliance
 */
export class PrivacyManager {
  private config?: PrivacyConfig;
  private piiPatterns: Map<string, RegExp> = new Map();

  async initialize(config: PrivacyConfig): Promise<void> {
    this.config = config;

    if (config.enabled) {
      this.initializePIIPatterns();
    }

    console.log("PrivacyManager initialized");
  }

  async processLog(log: StructuredLog): Promise<StructuredLog> {
    if (!this.config?.enabled) {
      return log;
    }

    let processedLog = { ...log };

    // Detect PII
    const piiInfo = await this.detectPII(processedLog);

    // Apply redaction if needed
    if (this.config.redaction.enabled && piiInfo.detected) {
      processedLog = await this.redactPII(processedLog, piiInfo);
    }

    // Add PII metadata
    processedLog.pii = piiInfo;

    return processedLog;
  }

  private initializePIIPatterns(): void {
    if (!this.config?.piiDetection.patterns) {
      return;
    }

    const patterns = this.config.piiDetection.patterns;

    if (patterns.email) {
      this.piiPatterns.set(
        "email",
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      );
    }

    if (patterns.phone) {
      this.piiPatterns.set(
        "phone",
        /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      );
    }

    if (patterns.creditCard) {
      this.piiPatterns.set("creditCard", /\b(?:\d[ -]*?){13,16}\b/g);
    }

    if (patterns.ssn) {
      this.piiPatterns.set("ssn", /\b\d{3}-\d{2}-\d{4}\b/g);
    }

    if (patterns.ipAddress) {
      this.piiPatterns.set("ipAddress", /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
    }

    if (patterns.address) {
      this.piiPatterns.set(
        "address",
        /\b\d+\s+([A-Z][a-z]*\s*)+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl)\b/gi,
      );
    }

    // Add custom patterns
    if (this.config.piiDetection.customPatterns) {
      for (const customPattern of this.config.piiDetection.customPatterns) {
        this.piiPatterns.set(customPattern.name, customPattern.pattern);
      }
    }
  }

  private async detectPII(log: StructuredLog): Promise<StructuredLog["pii"]> {
    const detectedFields: string[] = [];
    const content = this.extractLogContent(log);

    for (const [patternName, pattern] of this.piiPatterns.entries()) {
      if (pattern.test(content)) {
        detectedFields.push(patternName);
        // Reset regex lastIndex
        pattern.lastIndex = 0;
      }
    }

    return {
      detected: detectedFields.length > 0,
      redacted: false,
      fields: detectedFields,
    };
  }

  private extractLogContent(log: StructuredLog): string {
    const content: string[] = [];

    // Add message
    content.push(log.message);

    // Add error information
    if (log.error) {
      content.push(log.error.message);
      if (log.error.stack) {
        content.push(log.error.stack);
      }
    }

    // Add context data
    if (log.context) {
      content.push(JSON.stringify(log.context));
    }

    // Add metadata
    if (log.metadata) {
      content.push(JSON.stringify(log.metadata));
    }

    return content.join(" ");
  }

  private async redactPII(
    log: StructuredLog,
    piiInfo: StructuredLog["pii"],
  ): Promise<StructuredLog> {
    if (!piiInfo.fields || piiInfo.fields.length === 0) {
      return log;
    }

    let processedLog = { ...log };

    // Redact in message
    processedLog.message = this.redactPIIInString(
      processedLog.message,
      piiInfo,
    );

    // Redact in error information
    if (processedLog.error) {
      processedLog.error = {
        ...processedLog.error,
        message: this.redactPIIInString(processedLog.error.message, piiInfo),
        stack: processedLog.error.stack
          ? this.redactPIIInString(processedLog.error.stack, piiInfo)
          : undefined,
      };
    }

    // Redact in context
    if (processedLog.context) {
      processedLog.context = this.redactPIIInObject(
        processedLog.context,
        piiInfo,
      );
    }

    // Redact in metadata
    if (processedLog.metadata) {
      processedLog.metadata = this.redactPIIInObject(
        processedLog.metadata,
        piiInfo,
      );
    }

    return processedLog;
  }

  private redactPIIInString(
    text: string,
    piiInfo: StructuredLog["pii"],
  ): string {
    if (!piiInfo.fields || piiInfo.fields.length === 0) {
      return text;
    }

    let redactedText = text;

    for (const fieldName of piiInfo.fields) {
      const pattern = this.piiPatterns.get(fieldName);
      if (!pattern) continue;

      const strategy = this.config?.redaction.strategy || "mask";
      const maskChar = this.config?.redaction.maskChar || "*";
      const preserveLength = this.config?.redaction.preserveLength !== false;

      redactedText = redactedText.replace(pattern, (match) => {
        switch (strategy) {
          case "remove":
            return "";
          case "hash":
            return this.simpleHash(match);
          case "mask":
          default:
            if (preserveLength) {
              return maskChar.repeat(match.length);
            } else {
              return `${maskChar}${fieldName}${maskChar}`;
            }
        }
      });

      // Reset regex lastIndex
      pattern.lastIndex = 0;
    }

    return redactedText;
  }

  private redactPIIInObject(obj: any, piiInfo: StructuredLog["pii"]): any {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactPIIInObject(item, piiInfo));
    }

    const redactedObj: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if this field should be redacted based on configuration
      if (
        this.config?.redaction.fields &&
        this.config.redaction.fields.includes(key)
      ) {
        redactedObj[key] =
          this.config.redaction.maskChar?.repeat(8) || "[REDACTED]";
      } else if (typeof value === "string") {
        redactedObj[key] = this.redactPIIInString(value, piiInfo);
      } else if (typeof value === "object") {
        redactedObj[key] = this.redactPIIInObject(value, piiInfo);
      } else {
        redactedObj[key] = value;
      }
    }

    return redactedObj;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// DEVELOPER TOOLS
// ============================================================================

/**
 * DeveloperTools provides log inspection and debugging utilities
 */
export class DeveloperTools {
  private config?: DevToolsConfig;
  private logHistory: StructuredLog[] = [];
  private maxHistorySize: number = 1000;
  private isDevMode: boolean = false;
  private debugPanel?: DebugPanel;

  async initialize(config: DevToolsConfig): Promise<void> {
    this.config = config;
    this.isDevMode = process.env.NODE_ENV === "development";
    this.maxHistorySize = config.logBrowser.maxEntries || 1000;

    if (config.enabled && this.isDevMode) {
      await this.initializeDebugPanel();
      await this.setupKeyboardShortcuts();
    }

    console.log("DeveloperTools initialized");
  }

  async addLog(log: StructuredLog): Promise<void> {
    if (!this.config?.enabled) {
      return;
    }

    // Add to history
    this.logHistory.push(log);

    // Trim history if needed
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }

    // Update debug panel
    if (this.debugPanel) {
      this.debugPanel.addLog(log);
    }

    // Console output if enabled
    if (this.config.realTimeMonitoring.consoleOutput) {
      this.outputToConsole(log);
    }
  }

  private async initializeDebugPanel(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    this.debugPanel = new DebugPanel(this.config!);
    await this.debugPanel.initialize();
  }

  private setupKeyboardShortcuts(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }

    window.addEventListener("keydown", (event) => {
      // Ctrl+Shift+L to toggle debug panel
      if (event.ctrlKey && event.shiftKey && event.key === "L") {
        event.preventDefault();
        this.toggleDebugPanel();
      }

      // Ctrl+Shift+E to export logs
      if (event.ctrlKey && event.shiftKey && event.key === "E") {
        event.preventDefault();
        this.exportLogs();
      }

      // Ctrl+Shift+C to clear logs
      if (event.ctrlKey && event.shiftKey && event.key === "C") {
        event.preventDefault();
        this.clearLogs();
      }
    });

    return Promise.resolve();
  }

  private outputToConsole(log: StructuredLog): void {
    const config = this.config?.realTimeMonitoring;
    if (!config) {
      return;
    }

    const levelColors = {
      [LogLevel.DEBUG]: "#9CA3AF",
      [LogLevel.INFO]: "#3B82F6",
      [LogLevel.WARN]: "#F59E0B",
      [LogLevel.ERROR]: "#EF4444",
      [LogLevel.CRITICAL]: "#DC2626",
      [LogLevel.FATAL]: "#991B1B",
    };

    const levelSymbols = {
      [LogLevel.DEBUG]: "🔍",
      [LogLevel.INFO]: "ℹ️",
      [LogLevel.WARN]: "⚠️",
      [LogLevel.ERROR]: "❌",
      [LogLevel.CRITICAL]: "🚨",
      [LogLevel.FATAL]: "💀",
    };

    const color = levelColors[log.level];
    const symbol = levelSymbols[log.level];

    // Build log message
    let message = `${symbol} [${LogLevel[log.level]}] ${log.message}`;

    if (config.showTimestamps) {
      const timestamp = log.timestamp.toISOString();
      message = `[${timestamp}] ${message}`;
    }

    if (config.showContext && log.category) {
      message += ` (${log.category})`;
    }

    // Use console styling
    console.log(
      `%c${message}`,
      `color: ${color}; font-weight: bold;`,
      log.context,
      log.error,
      log.metadata,
    );
  }

  private toggleDebugPanel(): void {
    if (!this.debugPanel) {
      return;
    }

    if (this.debugPanel.isVisible()) {
      this.debugPanel.hide();
    } else {
      this.debugPanel.show();
    }
  }

  getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    search?: string;
    timeRange?: { start: Date; end: Date };
  }): StructuredLog[] {
    let logs = [...this.logHistory];

    if (filter) {
      // Filter by level
      if (filter.level !== undefined) {
        logs = logs.filter((log) => log.level >= filter.level!);
      }

      // Filter by category
      if (filter.category) {
        logs = logs.filter((log) => log.category.includes(filter.category!));
      }

      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        logs = logs.filter(
          (log) =>
            log.message.toLowerCase().includes(searchTerm) ||
            log.category.toLowerCase().includes(searchTerm) ||
            log.error?.message?.toLowerCase().includes(searchTerm) ||
            false,
        );
      }

      // Filter by time range
      if (filter.timeRange) {
        logs = logs.filter(
          (log) =>
            log.timestamp >= filter.timeRange!.start &&
            log.timestamp <= filter.timeRange!.end,
        );
      }
    }

    return logs.reverse(); // Show newest first
  }

  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    timeRange: { start: Date; end: Date } | null;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const log of this.logHistory) {
      // Count by level
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;

      // Count by category
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    const timeRange =
      this.logHistory.length > 0
        ? {
            start: this.logHistory[0].timestamp,
            end: this.logHistory[this.logHistory.length - 1].timestamp,
          }
        : null;

    return {
      total: this.logHistory.length,
      byLevel,
      byCategory,
      timeRange,
    };
  }

  exportLogs(format: "json" | "csv" = "json"): string {
    const logs = this.getLogs();

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    } else if (format === "csv") {
      return this.convertToCSV(logs);
    }

    return "";
  }

  private convertToCSV(logs: StructuredLog[]): string {
    const headers = [
      "timestamp",
      "level",
      "category",
      "message",
      "error.name",
      "error.message",
      "context.userId",
      "context.sessionId",
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      LogLevel[log.level],
      log.category,
      `"${log.message.replace(/"/g, '""')}"`,
      log.error?.name || "",
      `"${(log.error?.message || "").replace(/"/g, '""')}"`,
      log.context?.userId || "",
      log.context?.sessionId || "",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  clearLogs(): void {
    this.logHistory = [];
    if (this.debugPanel) {
      this.debugPanel.clearLogs();
    }
  }
}

// ============================================================================
// DEBUG PANEL
// ============================================================================

/**
 * DebugPanel provides a visual interface for log inspection in development
 */
class DebugPanel {
  private config: DevToolsConfig;
  private visible: boolean = false;
  private container?: HTMLElement;

  constructor(config: DevToolsConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (typeof document === "undefined") {
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "error-logger-debug-panel";
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 300px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      z-index: 999999;
      display: none;
      overflow: hidden;
      border: 1px solid #333;
      border-radius: 0 0 0 8px;
    `;

    // Create header
    const header = document.createElement("div");
    header.style.cssText = `
      background: #333;
      padding: 8px;
      border-bottom: 1px solid #555;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>Error Logger Debug Panel</span>
      <button onclick="this.parentElement.parentElement.style.display='none'" style="
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
      ">×</button>
    `;

    // Create log container
    const logContainer = document.createElement("div");
    logContainer.id = "debug-log-container";
    logContainer.style.cssText = `
      height: calc(100% - 40px);
      overflow-y: auto;
      padding: 8px;
    `;

    this.container.appendChild(header);
    this.container.appendChild(logContainer);
    document.body.appendChild(this.container);
  }

  show(): void {
    if (this.container) {
      this.container.style.display = "block";
      this.visible = true;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.visible = false;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  addLog(log: StructuredLog): void {
    if (!this.container || !this.visible) {
      return;
    }

    const logContainer = this.container.querySelector(
      "#debug-log-container",
    ) as HTMLElement;
    if (!logContainer) {
      return;
    }

    const logElement = document.createElement("div");
    logElement.style.cssText = `
      margin-bottom: 8px;
      padding: 4px;
      border-left: 3px solid ${this.getLevelColor(log.level)};
      background: rgba(255, 255, 255, 0.05);
    `;

    const timestamp = log.timestamp.toLocaleTimeString();
    const levelName = LogLevel[log.level];

    logElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="color: ${this.getLevelColor(log.level)};">[${levelName}]</span>
        <span style="color: #888;">${timestamp}</span>
      </div>
      <div style="color: #fff; margin-bottom: 2px;">${log.message}</div>
      <div style="color: #888; font-size: 10px;">${log.category}</div>
    `;

    // Add to top (newest first)
    logContainer.insertBefore(logElement, logContainer.firstChild);

    // Keep only last 100 visible logs
    while (logContainer.children.length > 100) {
      logContainer.removeChild(logContainer.lastChild!);
    }
  }

  clearLogs(): void {
    if (!this.container) {
      return;
    }

    const logContainer = this.container.querySelector(
      "#debug-log-container",
    ) as HTMLElement;
    if (logContainer) {
      logContainer.innerHTML = "";
    }
  }

  private getLevelColor(level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: "#9CA3AF",
      [LogLevel.INFO]: "#3B82F6",
      [LogLevel.WARN]: "#F59E0B",
      [LogLevel.ERROR]: "#EF4444",
      [LogLevel.CRITICAL]: "#DC2626",
      [LogLevel.FATAL]: "#991B1B",
    };
    return colors[level] || "#FFF";
  }
}

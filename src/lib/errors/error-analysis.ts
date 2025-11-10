/**
 * Error Analysis Utilities
 *
 * Advanced error analysis utilities for pattern recognition,
 * clustering, and intelligent error processing.
 */

import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorPattern,
  ErrorCluster,
  ErrorAnalysis,
  ErrorContext
} from "./error-classifier";

// ============================================================================
// PATTERN RECOGNITION ENGINE
// ============================================================================

/**
 * Pattern recognition engine for identifying recurring error patterns
 */
export class PatternRecognitionEngine {
  private patterns: Map<string, ErrorPattern> = new Map();
  private minConfidence = 0.7;
  private maxPatterns = 1000;

  /**
   * Learn a new pattern from error data
   */
  learnPattern(
    errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>,
    patternName?: string
  ): ErrorPattern | null {
    if (errors.length < 3) {
      return null; // Need at least 3 similar errors to learn a pattern
    }

    const commonElements = this.findCommonElements(errors);
    if (!commonElements) {
      return null;
    }

    const pattern: ErrorPattern = {
      id: this.generatePatternId(),
      name: patternName || `Pattern-${commonElements.type}`,
      description: `Learned pattern for ${commonElements.type} errors`,
      category: commonElements.category,
      type: commonElements.type,
      severity: commonElements.severity,
      rootCause: this.inferRootCause(errors),
      recoveryStrategy: this.inferRecoveryStrategy(errors),
      successProbability: this.calculateSuccessProbability(errors),
      frequency: errors.length,
      lastSeen: new Date(Math.max(...errors.map(e => e.context.timestamp.getTime()))),
      confidence: commonElements.confidence,
      conditions: commonElements.conditions
    };

    this.addPattern(pattern);
    return pattern;
  }

  /**
   * Find common elements across multiple errors
   */
  private findCommonElements(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>) {
    if (errors.length === 0) return null;

    const first = errors[0].analysis;
    let consistentCategory = true;
    let consistentType = true;
    let consistentSeverity = true;

    // Check consistency across all errors
    for (const error of errors) {
      if (error.analysis.category !== first.category) consistentCategory = false;
      if (error.analysis.type !== first.type) consistentType = false;
      if (error.analysis.severity !== first.severity) consistentSeverity = false;
    }

    // If not consistent enough, return null
    const consistencyScore = [consistentCategory, consistentType, consistentSeverity].filter(Boolean).length / 3;
    if (consistencyScore < 0.6) return null;

    // Extract common conditions
    const conditions = this.extractCommonConditions(errors);

    return {
      category: first.category,
      type: first.type,
      severity: first.severity,
      confidence: consistencyScore,
      conditions
    };
  }

  /**
   * Extract common conditions from errors
   */
  private extractCommonConditions(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>) {
    const conditions: Array<{ field: string; operator: string; value: any; weight: number }> = [];

    // Analyze message patterns
    const messagePatterns = this.findMessagePatterns(errors.map(e => e.error?.message || ""));
    messagePatterns.forEach(pattern => {
      conditions.push({
        field: "message",
        operator: "regex",
        value: pattern.regex,
        weight: pattern.frequency
      });
    });

    // Analyze status codes
    const statusCodes = this.findCommonStatusCodes(errors);
    statusCodes.forEach(code => {
      conditions.push({
        field: "statusCode",
        operator: "equals",
        value: code.code,
        weight: code.frequency
      });
    });

    // Analyze components
    const components = this.findCommonComponents(errors);
    components.forEach(comp => {
      conditions.push({
        field: "component",
        operator: "equals",
        value: comp.component,
        weight: comp.frequency
      });
    });

    return conditions;
  }

  /**
   * Find patterns in error messages
   */
  private findMessagePatterns(messages: string[]): Array<{ regex: string; frequency: number }> {
    const patterns: Map<string, number> = new Map();

    for (const message of messages) {
      const words = message.toLowerCase().split(/\s+/);

      // Find significant words (not too common, not too rare)
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words.slice(i, i + 2).join("\\s+");
        if (phrase.length > 3 && !this.isCommonWord(phrase)) {
          patterns.set(phrase, (patterns.get(phrase) || 0) + 1);
        }
      }
    }

    // Filter and convert to regex patterns
    return Array.from(patterns.entries())
      .filter(([_, freq]) => freq >= 2)
      .map(([phrase, freq]) => ({
        regex: `\\b${phrase}\\b`,
        frequency: freq / messages.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * Find common status codes
   */
  private findCommonStatusCodes(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>) {
    const codes: Map<number, number> = new Map();

    for (const error of errors) {
      const statusCode = error.error?.statusCode || error.error?.status;
      if (statusCode) {
        codes.set(statusCode, (codes.get(statusCode) || 0) + 1);
      }
    }

    return Array.from(codes.entries())
      .filter(([_, freq]) => freq >= 2)
      .map(([code, freq]) => ({
        code,
        frequency: freq / errors.length
      }));
  }

  /**
   * Find common components
   */
  private findCommonComponents(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>) {
    const components: Map<string, number> = new Map();

    for (const error of errors) {
      const component = error.context.component;
      if (component) {
        components.set(component, (components.get(component) || 0) + 1);
      }
    }

    return Array.from(components.entries())
      .filter(([_, freq]) => freq >= 2)
      .map(([component, freq]) => ({
        component,
        frequency: freq / errors.length
      }));
  }

  /**
   * Check if a word is too common to be significant
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "error", "failed", "unable"];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Infer root cause from similar errors
   */
  private inferRootCause(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>): string {
    const rootCauses = errors.map(e => e.analysis.rootCause).filter(Boolean);

    if (rootCauses.length === 0) return "Unknown cause";

    // Find most common root cause
    const causeCounts = new Map<string, number>();
    for (const cause of rootCauses) {
      causeCounts.set(cause, (causeCounts.get(cause) || 0) + 1);
    }

    const mostCommon = Array.from(causeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon ? mostCommon[0] : "Unknown cause";
  }

  /**
   * Infer recovery strategy from similar errors
   */
  private inferRecoveryStrategy(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>) {
    const strategies = errors.map(e => e.analysis.recoveryStrategy);

    // Count strategy frequencies
    const strategyCounts = new Map<string, number>();
    for (const strategy of strategies) {
      strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
    }

    // Return most common strategy
    return Array.from(strategyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Calculate success probability from historical data
   */
  private calculateSuccessProbability(errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>): number {
    const probabilities = errors.map(e => e.analysis.successProbability).filter(p => p !== undefined);

    if (probabilities.length === 0) return 0.5;

    // Return average probability
    const sum = probabilities.reduce((acc, p) => acc + p, 0);
    return sum / probabilities.length;
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add pattern to the engine
   */
  private addPattern(pattern: ErrorPattern): void {
    // Remove old patterns if we exceed limit
    if (this.patterns.size >= this.maxPatterns) {
      const oldest = Array.from(this.patterns.entries())
        .sort((a, b) => a[1].lastSeen.getTime() - b[1].lastSeen.getTime())[0];
      this.patterns.delete(oldest[0]);
    }

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Get all patterns
   */
  getPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: ErrorCategory): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.category === category);
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: ErrorType): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.type === type);
  }
}

// ============================================================================
// ERROR CLUSTERING ENGINE
// ============================================================================

/**
 * Error clustering engine for grouping similar errors
 */
export class ErrorClusteringEngine {
  private clusters: Map<string, ErrorCluster> = new Map();
  private maxClusterAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private minClusterSize = 3;

  /**
   * Cluster errors based on similarity
   */
  clusterErrors(
    errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): ErrorCluster[] {
    // Clean up old clusters
    this.cleanupOldClusters();

    // Group errors by category and type
    const groups = this.groupErrors(errors);

    const newClusters: ErrorCluster[] = [];

    for (const [key, group] of groups.entries()) {
      if (group.length >= this.minClusterSize) {
        const cluster = this.createCluster(key, group);
        newClusters.push(cluster);

        // Update existing cluster or add new one
        const existing = this.clusters.get(key);
        if (existing) {
          this.updateCluster(existing, group);
        } else {
          this.clusters.set(key, cluster);
        }
      }
    }

    return newClusters;
  }

  /**
   * Group errors by similarity
   */
  private groupErrors(
    errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): Map<string, Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>> {
    const groups = new Map<string, Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>>();

    for (const error of errors) {
      const key = this.generateClusterKey(error.analysis);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(error);
    }

    return groups;
  }

  /**
   * Generate cluster key based on error analysis
   */
  private generateClusterKey(analysis: ErrorAnalysis): string {
    return `${analysis.category}-${analysis.type}`;
  }

  /**
   * Create a new cluster from error group
   */
  private createCluster(
    key: string,
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): ErrorCluster {
    const firstAnalysis = group[0].analysis;
    const timestamps = group.map(e => e.context.timestamp);
    const firstOccurrence = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const lastOccurrence = new Date(Math.max(...timestamps.map(t => t.getTime())));

    // Calculate common patterns and root causes
    const commonPatterns = this.findCommonPatterns(group);
    const rootCause = this.findCommonRootCause(group);
    const recommendedAction = this.findRecommendedAction(group);

    return {
      id: key,
      name: `${firstAnalysis.category} - ${firstAnalysis.type}`,
      description: `Cluster of ${group.length} similar ${firstAnalysis.category} errors`,
      category: firstAnalysis.category,
      type: firstAnalysis.type,
      severity: this.calculateClusterSeverity(group),
      errorIds: group.map((_, index) => `${key}-${index}`),
      errorCount: group.length,
      frequency: this.calculateClusterFrequency(group, firstOccurrence, lastOccurrence),
      firstOccurrence,
      lastOccurrence,
      timeSpan: lastOccurrence.getTime() - firstOccurrence.getTime(),
      commonPatterns,
      rootCause,
      recommendedAction
    };
  }

  /**
   * Update existing cluster with new data
   */
  private updateCluster(
    cluster: ErrorCluster,
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): void {
    const timestamps = group.map(e => e.context.timestamp);
    const firstOccurrence = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const lastOccurrence = new Date(Math.max(...timestamps.map(t => t.getTime())));

    cluster.errorCount += group.length;
    cluster.lastOccurrence = lastOccurrence;
    cluster.timeSpan = cluster.lastOccurrence.getTime() - cluster.firstOccurrence.getTime();
    cluster.frequency = this.calculateClusterFrequency(
      [...Array(cluster.errorCount)], // Simulate all errors
      cluster.firstOccurrence,
      cluster.lastOccurrence
    );

    // Update common patterns and recommendations
    const allErrors = group; // In practice, you'd want to combine with existing errors
    cluster.commonPatterns = this.findCommonPatterns(allErrors);
    cluster.recommendedAction = this.findRecommendedAction(allErrors);
  }

  /**
   * Find common patterns in error group
   */
  private findCommonPatterns(
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): string[] {
    const patternCounts = new Map<string, number>();

    for (const error of group) {
      if (error.analysis.pattern) {
        patternCounts.set(error.analysis.pattern, (patternCounts.get(error.analysis.pattern) || 0) + 1);
      }
    }

    return Array.from(patternCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, _]) => pattern);
  }

  /**
   * Find common root cause in error group
   */
  private findCommonRootCause(
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): string {
    const causeCounts = new Map<string, number>();

    for (const error of group) {
      if (error.analysis.rootCause) {
        causeCounts.set(error.analysis.rootCause, (causeCounts.get(error.analysis.rootCause) || 0) + 1);
      }
    }

    const mostCommon = Array.from(causeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon ? mostCommon[0] : "Unknown cause";
  }

  /**
   * Find recommended action for error group
   */
  private findRecommendedAction(
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): string {
    const actionCounts = new Map<string, number>();

    for (const error of group) {
      for (const action of error.analysis.recommendedActions) {
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      }
    }

    const mostRecommended = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return mostRecommended ? mostRecommended[0] : "Monitor and investigate";
  }

  /**
   * Calculate cluster severity based on worst error in group
   */
  private calculateClusterSeverity(
    group: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis }>
  ): ErrorSeverity {
    const severityOrder = {
      [ErrorSeverity.CRITICAL]: 4,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.INFO]: 0
    };

    let maxSeverity = ErrorSeverity.INFO;
    let maxScore = -1;

    for (const error of group) {
      const score = severityOrder[error.analysis.severity];
      if (score > maxScore) {
        maxScore = score;
        maxSeverity = error.analysis.severity;
      }
    }

    return maxSeverity;
  }

  /**
   * Calculate cluster frequency (errors per hour)
   */
  private calculateClusterFrequency(
    group: any[],
    firstOccurrence: Date,
    lastOccurrence: Date
  ): number {
    const timeSpan = lastOccurrence.getTime() - firstOccurrence.getTime();
    const hours = timeSpan / (60 * 60 * 1000);

    return hours > 0 ? group.length / hours : 0;
  }

  /**
   * Clean up old clusters
   */
  private cleanupOldClusters(): void {
    const cutoff = Date.now() - this.maxClusterAge;

    for (const [key, cluster] of this.clusters.entries()) {
      if (cluster.lastOccurrence.getTime() < cutoff) {
        this.clusters.delete(key);
      }
    }
  }

  /**
   * Get all active clusters
   */
  getActiveClusters(): ErrorCluster[] {
    this.cleanupOldClusters();
    return Array.from(this.clusters.values());
  }

  /**
   * Get clusters by severity
   */
  getClustersBySeverity(severity: ErrorSeverity): ErrorCluster[] {
    return this.getActiveClusters().filter(cluster => cluster.severity === severity);
  }
}

// ============================================================================
// ERROR PREDICTION ENGINE
// ============================================================================

/**
 * Error prediction engine for proactive error prevention
 */
export class ErrorPredictionEngine {
  private history: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }> = [];
  private maxHistorySize = 10000;

  /**
   * Add error to history
   */
  addError(error: any, context: ErrorContext, analysis: ErrorAnalysis): void {
    this.history.push({
      error,
      context,
      analysis,
      timestamp: new Date()
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  /**
   * Predict likelihood of specific error types
   */
  predictErrorLikelihood(
    context: Partial<ErrorContext>,
    timeWindow: number = 60 * 60 * 1000 // 1 hour
  ): Map<ErrorType, number> {
    const predictions = new Map<ErrorType, number>();

    // Analyze historical patterns
    const recentErrors = this.getRecentErrors(timeWindow);

    // Calculate base probabilities
    const baseProbabilities = this.calculateBaseProbabilities(recentErrors);

    // Adjust based on current context
    const contextAdjustments = this.calculateContextAdjustments(context);

    // Combine and normalize
    for (const [errorType, baseProb] of baseProbabilities.entries()) {
      const adjustment = contextAdjustments.get(errorType) || 0;
      const adjustedProb = Math.max(0, Math.min(1, baseProb + adjustment));
      predictions.set(errorType, adjustedProb);
    }

    return predictions;
  }

  /**
   * Get recent errors within time window
   */
  private getRecentErrors(timeWindow: number): Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }> {
    const cutoff = Date.now() - timeWindow;
    return this.history.filter(entry => entry.timestamp.getTime() > cutoff);
  }

  /**
   * Calculate base probabilities from historical data
   */
  private calculateBaseProbabilities(
    errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }>
  ): Map<ErrorType, number> {
    const typeCounts = new Map<ErrorType, number>();
    const total = errors.length;

    for (const error of errors) {
      const type = error.analysis.type;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    const probabilities = new Map<ErrorType, number>();
    for (const [type, count] of typeCounts.entries()) {
      probabilities.set(type, count / total);
    }

    return probabilities;
  }

  /**
   * Calculate context-based adjustments
   */
  private calculateContextAdjustments(context: Partial<ErrorContext>): Map<ErrorType, number> {
    const adjustments = new Map<ErrorType, number>();

    // Network type adjustments
    if (context.networkType === "cellular") {
      adjustments.set(ErrorType.CONNECTION_FAILURE, 0.1);
      adjustments.set(ErrorType.CONNECTION_TIMEOUT, 0.15);
    }

    // Battery level adjustments
    if (context.batteryLevel && context.batteryLevel < 0.2) {
      adjustments.set(ErrorType.CONNECTION_TIMEOUT, 0.1);
      adjustments.set(ErrorType.TRANSCRIPTION_TIMEOUT, 0.05);
    }

    // Low power mode adjustments
    if (context.isLowPowerMode) {
      adjustments.set(ErrorType.TRANSCRIPTION_TIMEOUT, 0.1);
      adjustments.set(ErrorType.CPU_THRESHOLD_EXCEEDED, 0.05);
    }

    // Memory usage adjustments
    if (context.memoryUsage && context.memoryUsage > 0.8) {
      adjustments.set(ErrorType.MEMORY_LEAK, 0.2);
      adjustments.set(ErrorType.CPU_THRESHOLD_EXCEEDED, 0.15);
    }

    // Component-specific adjustments
    if (context.component) {
      const componentRisk = this.getComponentRisk(context.component);
      for (const [errorType, risk] of componentRisk.entries()) {
        adjustments.set(errorType, risk);
      }
    }

    return adjustments;
  }

  /**
   * Get risk factors for specific components
   */
  private getComponentRisk(component: string): Map<ErrorType, number> {
    const risks = new Map<ErrorType, number>();

    switch (component) {
      case "FileUpload":
        risks.set(ErrorType.FILE_TOO_LARGE, 0.15);
        risks.set(ErrorType.UPLOAD_FAILED, 0.1);
        break;
      case "TranscriptionService":
        risks.set(ErrorType.TRANSCRIPTION_TIMEOUT, 0.2);
        risks.set(ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE, 0.1);
        break;
      case "AudioPlayer":
        risks.set(ErrorType.AUDIO_DECODE_FAILURE, 0.1);
        risks.set(ErrorType.AUDIO_FORMAT_UNSUPPORTED, 0.05);
        break;
      case "Database":
        risks.set(ErrorType.DATABASE_CONNECTION, 0.15);
        risks.set(ErrorType.DATABASE_TIMEOUT, 0.1);
        break;
    }

    return risks;
  }

  /**
   * Get error prevention recommendations
   */
  getPreventionRecommendations(
    context: Partial<ErrorContext>
  ): Array<{ errorType: ErrorType; probability: number; recommendations: string[] }> {
    const predictions = this.predictErrorLikelihood(context);
    const recommendations: Array<{ errorType: ErrorType; probability: number; recommendations: string[] }> = [];

    // Sort by probability and take top 5
    const sortedPredictions = Array.from(predictions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [errorType, probability] of sortedPredictions) {
      if (probability > 0.1) { // Only include if probability is significant
        const typeRecommendations = this.getTypeSpecificRecommendations(errorType, context);
        recommendations.push({
          errorType,
          probability,
          recommendations: typeRecommendations
        });
      }
    }

    return recommendations;
  }

  /**
   * Get type-specific prevention recommendations
   */
  private getTypeSpecificRecommendations(
    errorType: ErrorType,
    context: Partial<ErrorContext>
  ): string[] {
    const recommendations: string[] = [];

    switch (errorType) {
      case ErrorType.CONNECTION_FAILURE:
        recommendations.push("Implement robust retry logic with exponential backoff");
        recommendations.push("Add network connectivity checks before requests");
        if (context.networkType === "cellular") {
          recommendations.push("Optimize data usage for mobile networks");
        }
        break;

      case ErrorType.FILE_TOO_LARGE:
        recommendations.push("Implement client-side file size validation");
        recommendations.push("Add file compression options");
        recommendations.push("Implement chunked upload for large files");
        break;

      case ErrorType.TRANSCRIPTION_TIMEOUT:
        recommendations.push("Implement progress tracking and timeout handling");
        recommendations.push("Add audio duration validation");
        if (context.isLowPowerMode) {
          recommendations.push("Optimize transcription for low power mode");
        }
        break;

      case ErrorType.MEMORY_LEAK:
        recommendations.push("Implement memory usage monitoring");
        recommendations.push("Add automatic cleanup for unused resources");
        recommendations.push("Review component lifecycle management");
        break;

      case ErrorType.API_RATE_LIMIT:
        recommendations.push("Implement client-side request throttling");
        recommendations.push("Add request queue with priority handling");
        recommendations.push("Monitor API usage and implement quotas");
        break;
    }

    return recommendations;
  }

  /**
   * Clear prediction history
   */
  clearHistory(): void {
    this.history = [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a pattern recognition engine instance
 */
export function createPatternRecognitionEngine(): PatternRecognitionEngine {
  return new PatternRecognitionEngine();
}

/**
 * Create an error clustering engine instance
 */
export function createErrorClusteringEngine(): ErrorClusteringEngine {
  return new ErrorClusteringEngine();
}

/**
 * Create an error prediction engine instance
 */
export function createErrorPredictionEngine(): ErrorPredictionEngine {
  return new ErrorPredictionEngine();
}

/**
 * Analyze error trends over time
 */
export function analyzeErrorTrends(
  errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }>,
  timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours
): {
  trend: "increasing" | "decreasing" | "stable";
  rate: number; // errors per hour
  forecast: number; // predicted errors in next window
  confidence: number;
} {
  const now = Date.now();
  const windowStart = now - timeWindow;

  const recentErrors = errors.filter(e => e.timestamp.getTime() > windowStart);
  const rate = recentErrors.length / (timeWindow / (60 * 60 * 1000)); // per hour

  // Simple trend analysis: compare recent to previous period
  const previousWindowStart = windowStart - timeWindow;
  const previousErrors = errors.filter(e =>
    e.timestamp.getTime() > previousWindowStart && e.timestamp.getTime() <= windowStart
  );
  const previousRate = previousErrors.length / (timeWindow / (60 * 60 * 1000));

  let trend: "increasing" | "decreasing" | "stable";
  const changeThreshold = 0.2; // 20% change threshold

  if (rate > previousRate * (1 + changeThreshold)) {
    trend = "increasing";
  } else if (rate < previousRate * (1 - changeThreshold)) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }

  // Simple forecast based on recent trend
  const forecast = trend === "increasing" ? rate * 1.2 :
                   trend === "decreasing" ? rate * 0.8 : rate;

  // Calculate confidence based on data volume
  const confidence = Math.min(1, recentErrors.length / 10);

  return {
    trend,
    rate,
    forecast,
    confidence
  };
}

/**
 * Generate error report
 */
export function generateErrorReport(
  errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }>,
  timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours
): {
  summary: {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ type: ErrorType; count: number; percentage: number }>;
  };
  trends: ReturnType<typeof analyzeErrorTrends>;
  clusters: ErrorCluster[];
  recommendations: Array<{ priority: "high" | "medium" | "low"; recommendation: string }>;
} {
  const now = Date.now();
  const windowStart = now - timeWindow;

  const recentErrors = errors.filter(e => e.timestamp.getTime() > windowStart);

  // Summary statistics
  const errorsByCategory: Record<string, number> = {};
  const errorsByType: Record<string, number> = {};
  const errorsBySeverity: Record<string, number> = {};

  for (const error of recentErrors) {
    errorsByCategory[error.analysis.category] = (errorsByCategory[error.analysis.category] || 0) + 1;
    errorsByType[error.analysis.type] = (errorsByType[error.analysis.type] || 0) + 1;
    errorsBySeverity[error.analysis.severity] = (errorsBySeverity[error.analysis.severity] || 0) + 1;
  }

  const topErrors = Object.entries(errorsByType)
    .map(([type, count]) => ({
      type: type as ErrorType,
      count,
      percentage: (count / recentErrors.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Trend analysis
  const trends = analyzeErrorTrends(errors, timeWindow);

  // Clustering
  const clusteringEngine = createErrorClusteringEngine();
  const clusters = clusteringEngine.clusterErrors(recentErrors);

  // Generate recommendations
  const recommendations = generateRecommendations(recentErrors, clusters, trends);

  return {
    summary: {
      totalErrors: recentErrors.length,
      errorsByCategory: errorsByCategory as Record<ErrorCategory, number>,
      errorsByType: errorsByType as Record<ErrorType, number>,
      errorsBySeverity: errorsBySeverity as Record<ErrorSeverity, number>,
      topErrors
    },
    trends,
    clusters,
    recommendations
  };
}

/**
 * Generate recommendations based on error analysis
 */
function generateRecommendations(
  errors: Array<{ error: any; context: ErrorContext; analysis: ErrorAnalysis; timestamp: Date }>,
  clusters: ErrorCluster[],
  trends: ReturnType<typeof analyzeErrorTrends>
): Array<{ priority: "high" | "medium" | "low"; recommendation: string }> {
  const recommendations: Array<{ priority: "high" | "medium" | "low"; recommendation: string }> = [];

  // Trend-based recommendations
  if (trends.trend === "increasing" && trends.confidence > 0.7) {
    recommendations.push({
      priority: "high",
      recommendation: "Error rate is increasing significantly. Investigate root causes immediately."
    });
  }

  // Cluster-based recommendations
  const highSeverityClusters = clusters.filter(c => c.severity === "critical" || c.severity === "high");
  if (highSeverityClusters.length > 0) {
    recommendations.push({
      priority: "high",
      recommendation: `Found ${highSeverityClusters.length} high-severity error clusters. Prioritize fixing these issues.`
    });
  }

  // Frequency-based recommendations
  const frequentClusters = clusters.filter(c => c.frequency > 10); // More than 10 errors per hour
  if (frequentClusters.length > 0) {
    recommendations.push({
      priority: "medium",
      recommendation: `Found ${frequentClusters.length} high-frequency error clusters. Implement rate limiting or improve error handling.`
    });
  }

  // Type-specific recommendations
  const errorTypes = new Map<ErrorType, number>();
  for (const error of errors) {
    errorTypes.set(error.analysis.type, (errorTypes.get(error.analysis.type) || 0) + 1);
  }

  if (errorTypes.get(ErrorType.CONNECTION_FAILURE)! > 5) {
    recommendations.push({
      priority: "medium",
      recommendation: "High number of connection failures. Review network error handling and retry logic."
    });
  }

  if (errorTypes.get(ErrorType.TRANSCRIPTION_TIMEOUT)! > 3) {
    recommendations.push({
      priority: "medium",
      recommendation: "Multiple transcription timeouts. Consider implementing better timeout handling or audio validation."
    });
  }

  if (errorTypes.get(ErrorType.MEMORY_LEAK)! > 0) {
    recommendations.push({
      priority: "high",
      recommendation: "Memory leaks detected. Review component lifecycle and resource cleanup."
    });
  }

  return recommendations;
}

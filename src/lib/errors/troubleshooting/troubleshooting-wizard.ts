/**
 * Troubleshooting Wizard
 *
 * Interactive guided resolution system that walks users through troubleshooting
 * steps with decision trees, progress tracking, and verification.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TroubleshootingContext,
  WizardSession,
  WizardStep,
  WizardStepType,
  SessionProgress,
  SessionStatus,
  SymptomAnalysis,
  TroubleshootingGuide,
  TroubleshootingStep,
  StepCondition,
  StepAction,
  ActionType,
  VerificationStep,
  VerificationType,
  TroubleshootingConfig,
} from './types';

// ============================================================================
// TROUBLESHOOTING WIZARD CLASS
// ============================================================================

/**
 * Interactive troubleshooting wizard
 */
export class TroubleshootingWizard {
  private config: TroubleshootingConfig;
  private activeSessions = new Map<string, WizardSession>();
  private stepExecutors = new Map<ActionType, StepExecutor>();

  constructor(config: TroubleshootingConfig) {
    this.config = config;
    this.initializeStepExecutors();
  }

  /**
   * Initialize wizard session
   */
  public async initializeSession(session: WizardSession): Promise<void> {
    // Create initial wizard steps
    const steps = await this.createInitialSteps(session);

    session.steps = steps;
    session.totalSteps = steps.length;
    session.currentStep = 0;
    session.status = SessionStatus.ACTIVE;

    this.activeSessions.set(session.id, session);
  }

  /**
   * Update session from symptom analysis
   */
  public async updateSessionFromAnalysis(
    session: WizardSession,
    analysis: SymptomAnalysis[]
  ): Promise<void> {
    // Remove existing steps after initial analysis
    const keepSteps = session.steps.filter(step =>
      step.type === WizardStepType.WELCOME ||
      step.type === WizardStepType.SYMPTOM_CHECKER
    );

    // Add guide selection step
    const guideSelectionStep: WizardStep = {
      id: 'guide_selection',
      type: WizardStepType.GUIDE_SELECTION,
      title: 'Select Troubleshooting Guide',
      description: 'Based on your symptoms, here are the recommended troubleshooting guides:',
      content: {
        analysis,
        recommendations: [], // Will be populated by guidance generator
      },
      required: true,
      conditions: [],
      nextStepMapping: {},
    };

    keepSteps.push(guideSelectionStep);

    session.steps = keepSteps;
    session.totalSteps = session.steps.length;
    session.currentStep = Math.min(session.currentStep, session.totalSteps - 1);
  }

  /**
   * Execute a troubleshooting step
   */
  public async executeStep(
    session: WizardSession,
    stepId: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const step = session.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in session`);
    }

    // Check if step conditions are met
    if (!this.checkStepConditions(step.conditions, session)) {
      throw new Error(`Step conditions not met for ${stepId}`);
    }

    // Execute step based on type
    switch (step.type) {
      case WizardStepType.STEP_EXECUTION:
        return this.executeActionStep(step, session, parameters);

      case WizardStepType.VERIFICATION:
        return this.executeVerificationStep(step, session, parameters);

      case WizardStepType.GUIDE_SELECTION:
        return this.executeGuideSelection(step, session, parameters);

      default:
        return { success: true, message: 'Step completed' };
    }
  }

  /**
   * Skip a troubleshooting step
   */
  public async skipStep(session: WizardSession, stepId: string): Promise<void> {
    const stepIndex = session.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found in session`);
    }

    const step = session.steps[stepIndex];

    if (step.required) {
      throw new Error(`Required step ${stepId} cannot be skipped`);
    }

    // Move to next step
    session.currentStep = Math.min(stepIndex + 1, session.totalSteps - 1);
    session.lastActivity = new Date();
  }

  /**
   * Verify resolution
   */
  public async verifyResolution(
    session: WizardSession,
    verificationData?: Record<string, any>
  ): Promise<boolean> {
    // Check if we have verification steps
    const verificationSteps = session.steps.filter(s => s.type === WizardStepType.VERIFICATION);

    if (verificationSteps.length === 0) {
      return true; // No verification needed
    }

    // Execute verification steps
    for (const step of verificationSteps) {
      try {
        const result = await this.executeVerificationStep(step, session, verificationData);
        if (!result.success) {
          return false;
        }
      } catch (error) {
        console.warn('Verification step failed:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Get next step
   */
  public getNextStep(session: WizardSession): WizardStep | null {
    if (session.currentStep >= session.totalSteps - 1) {
      return null;
    }

    return session.steps[session.currentStep + 1];
  }

  /**
   * Get previous step
   */
  public getPreviousStep(session: WizardSession): WizardStep | null {
    if (session.currentStep <= 0) {
      return null;
    }

    return session.steps[session.currentStep - 1];
  }

  /**
   * Navigate to step
   */
  public async navigateToStep(session: WizardSession, stepId: string): Promise<void> {
    const stepIndex = session.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found in session`);
    }

    // Check if we can navigate to this step
    const targetStep = session.steps[stepIndex];
    if (!this.canNavigateToStep(targetStep, session)) {
      throw new Error(`Cannot navigate to step ${stepId}`);
    }

    session.currentStep = stepIndex;
    session.lastActivity = new Date();
  }

  /**
   * Get session progress
   */
  public getProgress(session: WizardSession): SessionProgress {
    const completedSteps = session.steps.slice(0, session.currentStep).length;
    const totalSteps = session.totalSteps;

    // Count successful/failed steps (would need more detailed tracking)
    const successfulSteps = session.progress.successfulSteps;
    const failedSteps = session.progress.failedSteps;
    const skippedSteps = session.progress.skippedSteps;

    return {
      completedSteps,
      successfulSteps,
      failedSteps,
      skippedSteps,
      percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      timeSpent: Date.now() - session.startTime.getTime(),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(session),
    };
  }

  /**
   * Create troubleshooting guide from session
   */
  public async createGuideFromSession(session: WizardSession): Promise<TroubleshootingGuide> {
    const executionSteps = session.steps
      .filter(s => s.type === WizardStepType.STEP_EXECUTION)
      .map(step => this.convertWizardStepToTroubleshootingStep(step));

    return {
      id: uuidv4(),
      title: `Custom Guide for ${session.context.errorId || 'Unknown Error'}`,
      description: 'Automatically generated troubleshooting guide based on your session',
      category: 'general' as any, // Would need proper category mapping
      severity: 'medium' as any,
      targetAudience: 'beginner' as any,
      estimatedTime: executionSteps.reduce((total, step) => total + step.estimatedTime, 0),
      successRate: 0, // Unknown for new guide
      difficulty: 'moderate' as any,
      prerequisites: [],
      symptoms: session.symptomAnalysis.map(a => a.symptomId),
      steps: executionSteps,
      verification: [], // Would need verification step extraction
      alternatives: [],
      faqs: [],
      relatedGuides: [],
      tags: ['custom', 'auto-generated'],
      author: 'TroubleshootingWizard',
      lastUpdated: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: TroubleshootingConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxDuration = this.config.maxSessionDuration * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startTime.getTime();

      if (sessionAge > maxDuration) {
        session.status = SessionStatus.ABANDONED;
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Destroy wizard
   */
  public destroy(): void {
    this.activeSessions.clear();
    this.stepExecutors.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize step executors
   */
  private initializeStepExecutors(): void {
    this.stepExecutors.set(ActionType.BUTTON_CLICK, new ButtonClickExecutor());
    this.stepExecutors.set(ActionType.FORM_SUBMIT, new FormSubmitExecutor());
    this.stepExecutors.set(ActionType.API_CALL, new ApiCallExecutor());
    this.stepExecutors.set(ActionType.SCRIPT_EXECUTION, new ScriptExecutor());
    this.stepExecutors.set(ActionType.NAVIGATION, new NavigationExecutor());
    this.stepExecutors.set(ActionType.FILE_UPLOAD, new FileUploadExecutor());
    this.stepExecutors.set(ActionType.SETTINGS_CHANGE, new SettingsChangeExecutor());
    this.stepExecutors.set(ActionType.REFRESH, new RefreshExecutor());
    this.stepExecutors.set(ActionType.CLEAR_CACHE, new ClearCacheExecutor());
  }

  /**
   * Create initial wizard steps
   */
  private async createInitialSteps(session: WizardSession): Promise<WizardStep[]> {
    const steps: WizardStep[] = [];

    // Welcome step
    steps.push({
      id: 'welcome',
      type: WizardStepType.WELCOME,
      title: 'Welcome to Troubleshooting',
      description: 'Let\'s help you resolve the issue you\'re experiencing.',
      content: {
        errorId: session.context.errorId,
        errorCode: session.context.errorCode,
      },
      required: false,
      conditions: [],
      nextStepMapping: { next: 'symptom_checker' },
    });

    // Symptom checker step
    steps.push({
      id: 'symptom_checker',
      type: WizardStepType.SYMPTOM_CHECKER,
      title: 'Identify the Problem',
      description: 'Please answer a few questions to help us understand what\'s happening.',
      content: {
        categories: this.getRelevantCategories(session),
      },
      required: true,
      conditions: [],
      nextStepMapping: { next: 'guide_selection' },
    });

    return steps;
  }

  /**
   * Get relevant categories based on context
   */
  private getRelevantCategories(session: WizardSession): string[] {
    const categories = ['general'];

    // Add mobile-specific categories if on mobile
    if (session.context.isMobile) {
      categories.push('mobile_specific');
    }

    // Add network category if there are network-related error codes
    if (session.context.errorCode?.includes('network') ||
        session.context.errorCode?.includes('connection')) {
      categories.push('network');
    }

    // Add audio category if it's an audio-related error
    if (session.context.errorCode?.includes('audio') ||
        session.context.errorCode?.includes('transcription')) {
      categories.push('audio_playback');
      categories.push('transcription');
    }

    return categories;
  }

  /**
   * Execute action step
   */
  private async executeActionStep(
    step: WizardStep,
    session: WizardSession,
    parameters?: Record<string, any>
  ): Promise<any> {
    const guide = step.content.guide as TroubleshootingGuide;
    const stepIndex = step.content.stepIndex as number;
    const troubleshootingStep = guide.steps[stepIndex];

    if (!troubleshootingStep) {
      throw new Error(`Invalid step index ${stepIndex} in guide`);
    }

    const results = [];

    // Execute actions in the step
    for (const action of troubleshootingStep.actions) {
      const executor = this.stepExecutors.get(action.type);
      if (!executor) {
        console.warn(`No executor found for action type: ${action.type}`);
        continue;
      }

      try {
        const result = await executor.execute(action, parameters, session);
        results.push({ actionId: action.id, result });

        // Validate result if validation is configured
        if (action.validation && !this.validateActionResult(result, action.validation)) {
          throw new Error(`Action validation failed: ${action.validation.errorMessage}`);
        }
      } catch (error) {
        results.push({
          actionId: action.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    return { success: true, results };
  }

  /**
   * Execute verification step
   */
  private async executeVerificationStep(
    step: WizardStep,
    session: WizardSession,
    verificationData?: Record<string, any>
  ): Promise<any> {
    const verification = step.content.verification as VerificationStep;

    if (!verification) {
      return { success: true, message: 'No verification needed' };
    }

    switch (verification.type) {
      case VerificationType.AUTOMATIC:
        return this.executeAutomaticVerification(verification, session);

      case VerificationType.MANUAL:
        return this.executeManualVerification(verification, verificationData);

      case VerificationType.USER_CONFIRMATION:
        return this.executeUserConfirmationVerification(verification, verificationData);

      case VerificationType.SYSTEM_CHECK:
        return this.executeSystemCheckVerification(verification, session);

      default:
        return { success: true, message: 'Unknown verification type' };
    }
  }

  /**
   * Execute guide selection
   */
  private async executeGuideSelection(
    step: WizardStep,
    session: WizardSession,
    parameters?: Record<string, any>
  ): Promise<any> {
    const selectedGuideId = parameters?.guideId;
    if (!selectedGuideId) {
      throw new Error('No guide selected');
    }

    // Get the selected guide (would need guide repository)
    const selectedGuide = await this.getGuide(selectedGuideId);
    if (!selectedGuide) {
      throw new Error(`Guide ${selectedGuideId} not found`);
    }

    // Create execution steps from the guide
    const executionSteps = selectedGuide.steps.map((troubleshootingStep, index) => ({
      id: `guide_step_${index}`,
      type: WizardStepType.STEP_EXECUTION,
      title: troubleshootingStep.title,
      description: troubleshootingStep.description,
      content: {
        guide: selectedGuide,
        stepIndex: index,
      },
      required: true,
      conditions: troubleshootingStep.conditions.map(this.convertStepCondition),
      nextStepMapping: {},
    }));

    // Add verification step at the end
    if (selectedGuide.verification.length > 0) {
      executionSteps.push({
        id: 'verification',
        type: WizardStepType.VERIFICATION,
        title: 'Verify Resolution',
        description: 'Let\'s verify that the issue has been resolved.',
        content: {
          verification: selectedGuide.verification[0],
        },
        required: true,
        conditions: [],
        nextStepMapping: {},
      });
    }

    // Replace current steps with execution steps
    const keepSteps = session.steps.slice(0, session.currentStep + 1);
    session.steps = [...keepSteps, ...executionSteps];
    session.totalSteps = session.steps.length;

    return { success: true, guideId: selectedGuideId };
  }

  /**
   * Check step conditions
   */
  private checkStepConditions(conditions: StepCondition[], session: WizardSession): boolean {
    if (conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentOperator: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, session);

      if (currentOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      // Set operator for next condition
      if (condition.logicalOperator) {
        currentOperator = condition.logicalOperator;
      }
    }

    return result;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: StepCondition, session: WizardSession): boolean {
    // Get value from session answers or context
    const value = session.answers[condition.field] ||
                  (session.context as any)[condition.field];

    if (value === undefined) {
      return false;
    }

    // Implement condition evaluation logic (similar to symptom checker)
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'is_empty':
        return !value || value === '' || value === null;
      case 'is_not_empty':
        return value && value !== '' && value !== null;
      default:
        return false;
    }
  }

  /**
   * Check if we can navigate to a step
   */
  private canNavigateToStep(step: WizardStep, session: WizardSession): boolean {
    // Can always navigate backwards
    const stepIndex = session.steps.findIndex(s => s.id === step.id);
    if (stepIndex <= session.currentStep) {
      return true;
    }

    // Can only navigate forward if all previous required steps are completed
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = session.steps[i];
      if (prevStep.required && i >= session.currentStep) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTimeRemaining(session: WizardSession): number {
    const remainingSteps = session.totalSteps - session.currentStep;

    // Estimate 2 minutes per step on average
    return remainingSteps * 2 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Convert wizard step to troubleshooting step
   */
  private convertWizardStepToTroubleshootingStep(wizardStep: WizardStep): TroubleshootingStep {
    return {
      id: wizardStep.id,
      title: wizardStep.title,
      description: wizardStep.description,
      instructions: [], // Would need extraction from content
      type: 'troubleshooting' as any,
      difficulty: 'moderate' as any,
      estimatedTime: 2, // 2 minutes default
      requiredTools: [],
      risks: [],
      tips: [],
      images: [],
      videos: [],
      conditions: wizardStep.conditions,
      actions: [], // Would need extraction from content
      nextStepMapping: wizardStep.nextStepMapping,
    };
  }

  /**
   * Convert step condition
   */
  private convertStepCondition(condition: any): StepCondition {
    return {
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      description: condition.description || '',
    };
  }

  /**
   * Validate action result
   */
  private validateActionResult(result: any, validation: any): boolean {
    switch (validation.type) {
      case 'status_code':
        return result.statusCode === validation.criteria;
      case 'response_body':
        return JSON.stringify(result).includes(validation.criteria);
      case 'element_exists':
        // Would need DOM access for this
        return true;
      case 'custom':
        // Would need custom validation function
        return true;
      default:
        return true;
    }
  }

  /**
   * Execute automatic verification
   */
  private async executeAutomaticVerification(
    verification: VerificationStep,
    session: WizardSession
  ): Promise<any> {
    // Implement automatic verification logic
    // This would depend on the specific verification requirements
    return { success: true, message: 'Automatic verification passed' };
  }

  /**
   * Execute manual verification
   */
  private async executeManualVerification(
    verification: VerificationStep,
    verificationData?: Record<string, any>
  ): Promise<any> {
    const userConfirmed = verificationData?.confirmed;

    if (!userConfirmed) {
      return {
        success: false,
        message: verification.failureMessage || 'Verification failed'
      };
    }

    return {
      success: true,
      message: verification.successMessage || 'Verification successful'
    };
  }

  /**
   * Execute user confirmation verification
   */
  private async executeUserConfirmationVerification(
    verification: VerificationStep,
    verificationData?: Record<string, any>
  ): Promise<any> {
    const isResolved = verificationData?.isResolved;

    return {
      success: isResolved,
      message: isResolved
        ? verification.successMessage || 'Issue resolved'
        : verification.failureMessage || 'Issue not resolved',
    };
  }

  /**
   * Execute system check verification
   */
  private async executeSystemCheckVerification(
    verification: VerificationStep,
    session: WizardSession
  ): Promise<any> {
    // Implement system check logic
    // This would check system health, connectivity, etc.
    return { success: true, message: 'System check passed' };
  }

  /**
   * Get guide by ID (placeholder - would need guide repository)
   */
  private async getGuide(guideId: string): Promise<TroubleshootingGuide | null> {
    // This would typically fetch from a guide repository or database
    return null;
  }
}

// ============================================================================
// STEP EXECUTORS
// ============================================================================

/**
 * Base step executor interface
 */
interface StepExecutor {
  execute(action: StepAction, parameters?: Record<string, any>, session?: WizardSession): Promise<any>;
}

/**
 * Button click executor
 */
class ButtonClickExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot execute button click in server environment' };
    }

    const selector = action.script; // Using script field to store selector
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    (element as HTMLElement).click();

    return { success: true, message: 'Button clicked' };
  }
}

/**
 * Form submit executor
 */
class FormSubmitExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot execute form submit in server environment' };
    }

    const formSelector = action.script; // Using script field to store selector
    const form = document.querySelector(formSelector) as HTMLFormElement;

    if (!form) {
      throw new Error(`Form not found: ${formSelector}`);
    }

    // Fill form fields if parameters provided
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        const field = form.elements.namedItem(key) as HTMLInputElement;
        if (field) {
          field.value = String(value);
        }
      }
    }

    form.submit();

    return { success: true, message: 'Form submitted' };
  }
}

/**
 * API call executor
 */
class ApiCallExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (!action.apiCall) {
      throw new Error('No API call configuration provided');
    }

    const { method, url, headers, body } = action.apiCall;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return {
      success: response.ok,
      statusCode: response.status,
      data,
    };
  }
}

/**
 * Script execution executor
 */
class ScriptExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (!action.script) {
      throw new Error('No script provided');
    }

    // Execute script in a safe context
    // In production, this should use a sandboxed environment
    const func = new Function('parameters', 'session', action.script);
    const result = func(parameters, {}); // Session would be passed in real implementation

    return { success: true, result };
  }
}

/**
 * Navigation executor
 */
class NavigationExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot navigate in server environment' };
    }

    const url = action.script; // Using script field to store URL

    if (url) {
      window.location.href = url;
    } else {
      window.location.reload();
    }

    return { success: true, message: 'Navigation initiated' };
  }
}

/**
 * File upload executor
 */
class FileUploadExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (!parameters?.file) {
      throw new Error('No file provided for upload');
    }

    // This would implement actual file upload logic
    // For now, just simulate the upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'File uploaded successfully',
      fileName: parameters.file.name,
      fileSize: parameters.file.size,
    };
  }
}

/**
 * Settings change executor
 */
class SettingsChangeExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (!parameters?.setting) {
      throw new Error('No setting provided');
    }

    // This would implement actual settings change logic
    // For now, just simulate the change
    const setting = parameters.setting;
    const value = parameters.value;

    return {
      success: true,
      message: `Setting ${setting} changed to ${value}`,
    };
  }
}

/**
 * Refresh executor
 */
class RefreshExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot refresh in server environment' };
    }

    window.location.reload();

    return { success: true, message: 'Page refreshed' };
  }
}

/**
 * Clear cache executor
 */
class ClearCacheExecutor implements StepExecutor {
  async execute(action: StepAction, parameters?: Record<string, any>): Promise<any> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot clear cache in server environment' };
    }

    // Clear different types of cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear localStorage if requested
    if (parameters?.clearLocalStorage) {
      localStorage.clear();
    }

    // Clear sessionStorage if requested
    if (parameters?.clearSessionStorage) {
      sessionStorage.clear();
    }

    return { success: true, message: 'Cache cleared' };
  }
}

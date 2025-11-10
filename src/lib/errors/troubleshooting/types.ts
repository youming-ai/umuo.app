/**
 * Troubleshooting Guidance System Types
 *
 * Comprehensive type definitions for the troubleshooting guidance system.
 * Provides interfaces for symptom checking, guided resolution, knowledge base,
 * and interactive troubleshooting wizards.
 */

import { ErrorCategory, ErrorType, ErrorSeverity } from "../error-classifier";

// ============================================================================
// CORE TROUBLESHOOTING TYPES
// ============================================================================

/**
 * Troubleshooting session context
 */
export interface TroubleshootingContext {
  sessionId: string;
  userId?: string;
  errorId?: string;
  errorCode?: string;
  startTime: Date;
  userAgent: string;
  platform: string;
  isMobile: boolean;
  networkType?: string;
  appVersion?: string;
  browserInfo?: BrowserInfo;
  deviceInfo?: DeviceInfo;
}

/**
 * Browser information for troubleshooting
 */
export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  language: string;
  cookiesEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webGL: boolean;
  webAudio: boolean;
  mediaDevices: boolean;
}

/**
 * Device information for mobile troubleshooting
 */
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  osVersion: string;
  manufacturer?: string;
  model?: string;
  memory?: number;
  storage?: number;
  battery?: {
    level: number;
    charging: boolean;
  };
  network?: {
    type: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

// ============================================================================
// SYMPTOM CHECKER TYPES
// ============================================================================

/**
 * Symptom definition for problem identification
 */
export interface Symptom {
  id: string;
  name: string;
  description: string;
  category: SymptomCategory;
  severity: SymptomSeverity;
  questions: SymptomQuestion[];
  conditions: SymptomCondition[];
  relatedIssues: string[];
  tags: string[];
  lastUpdated: Date;
}

/**
 * Symptom categories for organization
 */
export enum SymptomCategory {
  NETWORK = "network",
  AUDIO_PLAYBACK = "audio_playback",
  FILE_UPLOAD = "file_upload",
  TRANSCRIPTION = "transcription",
  USER_INTERFACE = "user_interface",
  PERFORMANCE = "performance",
  AUTHENTICATION = "authentication",
  MOBILE_SPECIFIC = "mobile_specific",
  BROWSER_COMPATIBILITY = "browser_compatibility",
  GENERAL = "general"
}

/**
 * Symptom severity levels
 */
export enum SymptomSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Question for symptom identification
 */
export interface SymptomQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  options?: string[];
  required: boolean;
  condition?: string;
  weight: number;
}

/**
 * Question types for symptom checking
 */
export enum QuestionType {
  YES_NO = "yes_no",
  MULTIPLE_CHOICE = "multiple_choice",
  TEXT_INPUT = "text_input",
  NUMERIC_INPUT = "numeric_input",
  FILE_SELECT = "file_select",
  CHECKBOX = "checkbox",
  RADIO = "radio",
  DROPDOWN = "dropdown"
}

/**
 * Condition for symptom evaluation
 */
export interface SymptomCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * Operators for condition evaluation
 */
export enum ConditionOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  CONTAINS = "contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  GREATER_THAN = "greater_than",
  LESS_THAN = "less_than",
  GREATER_THAN_EQUAL = "greater_than_equal",
  LESS_THAN_EQUAL = "less_than_equal",
  IN = "in",
  NOT_IN = "not_in",
  IS_EMPTY = "is_empty",
  IS_NOT_EMPTY = "is_not_empty",
  MATCHES_REGEX = "matches_regex"
}

/**
 * Symptom analysis result
 */
export interface SymptomAnalysis {
  symptomId: string;
  confidence: number;
  matchingConditions: string[];
  answers: Record<string, any>;
  relatedSymptoms: string[];
  suggestedGuides: string[];
  timestamp: Date;
}

// ============================================================================
// TROUBLESHOOTING GUIDE TYPES
// ============================================================================

/**
 * Comprehensive troubleshooting guide
 */
export interface TroubleshootingGuide {
  id: string;
  title: string;
  description: string;
  category: SymptomCategory;
  severity: SymptomSeverity;
  targetAudience: TargetAudience;
  estimatedTime: number;
  successRate: number;
  difficulty: DifficultyLevel;
  prerequisites: string[];
  symptoms: string[];
  steps: TroubleshootingStep[];
  verification: VerificationStep[];
  alternatives: AlternativeSolution[];
  faqs: FAQ[];
  relatedGuides: string[];
  tags: string[];
  author: string;
  lastUpdated: Date;
  version: string;
}

/**
 * Target audience for guides
 */
export enum TargetAudience {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  DEVELOPER = "developer"
}

/**
 * Difficulty levels for troubleshooting steps
 */
export enum DifficultyLevel {
  EASY = "easy",
  MODERATE = "moderate",
  CHALLENGING = "challenging",
  EXPERT = "expert"
}

/**
 * Individual troubleshooting step
 */
export interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  type: StepType;
  difficulty: DifficultyLevel;
  estimatedTime: number;
  requiredTools: string[];
  risks: string[];
  tips: string[];
  images: string[];
  videos: string[];
  conditions: StepCondition[];
  actions: StepAction[];
  nextStepMapping: Record<string, string>;
}

/**
 * Step types for different kinds of actions
 */
export enum StepType {
  INFORMATION = "information",
  CHECK = "check",
  CONFIGURATION = "configuration",
  TROUBLESHOOTING = "troubleshooting",
  REPAIR = "repair",
  VERIFICATION = "verification",
  CONTACT_SUPPORT = "contact_support"
}

/**
 * Condition for step execution
 */
export interface StepCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  description: string;
}

/**
 * Action that can be performed in a step
 */
export interface StepAction {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  automation: boolean;
  script?: string;
  apiCall?: ApiCall;
  validation?: ActionValidation;
  confirmation: boolean;
}

/**
 * Action types for step automation
 */
export enum ActionType {
  BUTTON_CLICK = "button_click",
  FORM_SUBMIT = "form_submit",
  API_CALL = "api_call",
  SCRIPT_EXECUTION = "script_execution",
  NAVIGATION = "navigation",
  FILE_UPLOAD = "file_upload",
  SETTINGS_CHANGE = "settings_change",
  REFRESH = "refresh",
  CLEAR_CACHE = "clear_cache"
}

/**
 * API call definition for automated actions
 */
export interface ApiCall {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedResponse?: any;
}

/**
 * Validation for action completion
 */
export interface ActionValidation {
  type: 'status_code' | 'response_body' | 'element_exists' | 'custom';
  criteria: any;
  errorMessage: string;
}

/**
 * Verification step to confirm resolution
 */
export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  type: VerificationType;
  expectedOutcome: string;
  successMessage: string;
  failureMessage: string;
  retryAllowed: boolean;
  maxRetries: number;
}

/**
 * Verification types
 */
export enum VerificationType {
  AUTOMATIC = "automatic",
  MANUAL = "manual",
  USER_CONFIRMATION = "user_confirmation",
  SYSTEM_CHECK = "system_check"
}

/**
 * Alternative solution
 */
export interface AlternativeSolution {
  id: string;
  title: string;
  description: string;
  whenToUse: string;
  pros: string[];
  cons: string[];
  guide: string;
}

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

/**
 * Knowledge base entry
 */
export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  type: ContentType;
  category: SymptomCategory;
  tags: string[];
  relatedErrors: string[];
  relatedGuides: string[];
  searchTerms: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  author: string;
  lastUpdated: Date;
  version: string;
}

/**
 * Content types for knowledge base
 */
export enum ContentType {
  FAQ = "faq",
  ERROR_EXPLANATION = "error_explanation",
  BEST_PRACTICE = "best_practice",
  TUTORIAL = "tutorial",
  REFERENCE = "reference",
  GLOSSARY = "glossary",
  TROUBLESHOOTING = "troubleshooting"
}

/**
 * FAQ entry
 */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: SymptomCategory;
  relatedErrors: string[];
  relatedGuides: string[];
  helpfulCount: number;
  viewCount: number;
  lastUpdated: Date;
}

// ============================================================================
// WIZARD AND SESSION TYPES
// ============================================================================

/**
 * Troubleshooting wizard session
 */
export interface WizardSession {
  id: string;
  context: TroubleshootingContext;
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
  answers: Record<string, any>;
  symptomAnalysis: SymptomAnalysis[];
  selectedGuides: string[];
  progress: SessionProgress;
  status: SessionStatus;
  startTime: Date;
  lastActivity: Date;
  estimatedCompletionTime?: Date;
}

/**
 * Individual wizard step
 */
export interface WizardStep {
  id: string;
  type: WizardStepType;
  title: string;
  description: string;
  content: any;
  required: boolean;
  conditions: StepCondition[];
  nextStepMapping: Record<string, string>;
}

/**
 * Wizard step types
 */
export enum WizardStepType {
  WELCOME = "welcome",
  SYMPTOM_CHECKER = "symptom_checker",
  GUIDE_SELECTION = "guide_selection",
  STEP_EXECUTION = "step_execution",
  VERIFICATION = "verification",
  ALTERNATIVE_SUGGESTION = "alternative_suggestion",
  SUCCESS = "success",
  FAILURE = "failure",
  CONTACT_SUPPORT = "contact_support"
}

/**
 * Session progress tracking
 */
export interface SessionProgress {
  completedSteps: number;
  successfulSteps: number;
  failedSteps: number;
  skippedSteps: number;
  percentage: number;
  timeSpent: number;
  estimatedTimeRemaining: number;
}

/**
 * Session status
 */
export enum SessionStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
  FAILED = "failed"
}

// ============================================================================
// ANALYTICS AND FEEDBACK TYPES
// ============================================================================

/**
 * Troubleshooting analytics data
 */
export interface TroubleshootingAnalytics {
  sessionId: string;
  symptomId?: string;
  guideId?: string;
  stepId?: string;
  action: AnalyticsAction;
  duration: number;
  success: boolean;
  error?: string;
  feedback?: UserFeedback;
  context: Record<string, any>;
  timestamp: Date;
}

/**
 * Analytics actions
 */
export enum AnalyticsAction {
  SESSION_START = "session_start",
  SYMPTOM_IDENTIFIED = "symptom_identified",
  GUIDE_SELECTED = "guide_selected",
  STEP_STARTED = "step_started",
  STEP_COMPLETED = "step_completed",
  STEP_FAILED = "step_failed",
  STEP_SKIPPED = "step_skipped",
  VERIFICATION_SUCCESS = "verification_success",
  VERIFICATION_FAILED = "verification_failed",
  SESSION_COMPLETED = "session_completed",
  SESSION_ABANDONED = "session_abandoned",
  FEEDBACK_SUBMITTED = "feedback_submitted"
}

/**
 * User feedback
 */
export interface UserFeedback {
  rating: number;
  comment?: string;
  helpful: boolean;
  wouldRecommend: boolean;
  improvements: string[];
  contactAllowed: boolean;
  contactInfo?: string;
}

/**
 * Success metrics for troubleshooting
 */
export interface SuccessMetrics {
  totalSessions: number;
  completedSessions: number;
  successfulResolutions: number;
  averageSessionDuration: number;
  averageStepsPerSession: number;
  mostCommonSymptoms: Array<{
    symptomId: string;
    count: number;
    successRate: number;
  }>;
  mostEffectiveGuides: Array<{
    guideId: string;
    usageCount: number;
    successRate: number;
    averageTime: number;
  }>;
  userSatisfaction: {
    averageRating: number;
    wouldRecommend: number;
    helpfulCount: number;
    totalFeedback: number;
  };
}

// ============================================================================
// MOBILE-SPECIFIC TYPES
// ============================================================================

/**
 * Mobile-specific troubleshooting guide
 */
export interface MobileTroubleshootingGuide extends TroubleshootingGuide {
  mobileSpecific: true;
  deviceTypes: ('ios' | 'android' | 'both')[];
  appVersions: {
    min: string;
    max?: string;
  };
  touchOptimized: boolean;
  offlineAvailable: boolean;
  batteryConsiderations: boolean;
  networkOptimizations: boolean;
  storageRequirements: number;
}

/**
 * Mobile troubleshooting context
 */
export interface MobileTroubleshootingContext extends TroubleshootingContext {
  deviceInfo: DeviceInfo;
  appState: 'foreground' | 'background' | 'terminated';
  batteryOptimization: boolean;
  doNotDisturb: boolean;
  storageSpace: number;
  appCache: number;
  networkHistory: NetworkEvent[];
  performanceMetrics: MobilePerformanceMetrics;
}

/**
 * Mobile performance metrics
 */
export interface MobilePerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  batteryDrainRate: number;
  networkLatency: number;
  appStartupTime: number;
  renderTime: number;
  crashCount: number;
  anrCount: number;
}

/**
 * Network event for mobile troubleshooting
 */
export interface NetworkEvent {
  timestamp: Date;
  type: 'connected' | 'disconnected' | 'slow' | 'error';
  quality: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

// ============================================================================
// CONTENT MANAGEMENT TYPES
// ============================================================================

/**
 * Content management configuration
 */
export interface ContentManagementConfig {
  approvalRequired: boolean;
  versionControl: boolean;
  multiLanguage: boolean;
  autoTranslation: boolean;
  contentReview: boolean;
  analytics: boolean;
  search: boolean;
  categorization: boolean;
}

/**
 * Content authoring interface
 */
export interface ContentAuthor {
  id: string;
  name: string;
  email: string;
  role: AuthorRole;
  permissions: AuthorPermission[];
  specializations: SymptomCategory[];
  languages: string[];
}

/**
 * Author roles
 */
export enum AuthorRole {
  VIEWER = "viewer",
  AUTHOR = "author",
  EDITOR = "editor",
  REVIEWER = "reviewer",
  ADMIN = "admin"
}

/**
 * Author permissions
 */
export enum AuthorPermission {
  READ_CONTENT = "read_content",
  CREATE_CONTENT = "create_content",
  EDIT_CONTENT = "edit_content",
  DELETE_CONTENT = "delete_content",
  PUBLISH_CONTENT = "publish_content",
  REVIEW_CONTENT = "review_content",
  MANAGE_AUTHORS = "manage_authors",
  VIEW_ANALYTICS = "view_analytics",
  MANAGE_CONFIG = "manage_config"
}

/**
 * Content workflow status
 */
export enum ContentStatus {
  DRAFT = "draft",
  REVIEW = "review",
  APPROVED = "approved",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  DEPRECATED = "deprecated"
}

/**
 * Content review
 */
export interface ContentReview {
  id: string;
  contentId: string;
  reviewer: string;
  status: ReviewStatus;
  comments: ReviewComment[];
  rating: number;
  approvedVersion: string;
  timestamp: Date;
}

/**
 * Review status
 */
export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  NEEDS_CHANGES = "needs_changes"
}

/**
 * Review comment
 */
export interface ReviewComment {
  id: string;
  section: string;
  comment: string;
  type: 'suggestion' | 'correction' | 'question' | 'approval';
  resolved: boolean;
  timestamp: Date;
}

// ============================================================================
// CONFIGURATION AND INTEGRATION TYPES
// ============================================================================

/**
 * Troubleshooting system configuration
 */
export interface TroubleshootingConfig {
  enabled: boolean;
  autoStart: boolean;
  collectAnalytics: boolean;
  enableMobile: boolean;
  enableOffline: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  maxSessionDuration: number;
  cacheSize: number;
  analytics: AnalyticsConfig;
  content: ContentManagementConfig;
  integration: IntegrationConfig;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  collectUserAgent: boolean;
  collectDeviceInfo: boolean;
  collectNetworkInfo: boolean;
  collectPerformanceMetrics: boolean;
  retentionPeriod: number;
  anonymizeData: boolean;
  consentRequired: boolean;
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  errorClassification: boolean;
  recoveryStrategies: boolean;
  errorMiddleware: boolean;
  tanStackQuery: boolean;
  errorAnalytics: boolean;
  errorLogging: boolean;
  monitoring: boolean;
  supportSystems: SupportSystemConfig[];
}

/**
 * Support system integration
 */
export interface SupportSystemConfig {
  name: string;
  enabled: boolean;
  type: 'email' | 'chat' | 'ticket' | 'phone' | 'knowledge_base';
  configuration: Record<string, any>;
  autoEscalation: boolean;
  escalationRules: EscalationRule[];
}

/**
 * Escalation rule for support systems
 */
export interface EscalationRule {
  condition: string;
  action: string;
  priority: number;
  autoExecute: boolean;
}

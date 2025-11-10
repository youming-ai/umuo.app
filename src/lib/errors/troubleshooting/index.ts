/**
 * Troubleshooting Guidance System (T065)
 *
 * Comprehensive troubleshooting system that provides users with helpful guidance
 * for resolving errors, preventing future issues, and understanding application behavior.
 *
 * This system includes:
 * - Interactive troubleshooting wizards with decision trees
 * - Symptom checker tools for problem diagnosis
 * - Guided resolution steps with progress tracking
 * - Comprehensive FAQ database with searchable content
 * - Mobile-specific troubleshooting guides
 * - Analytics integration for effectiveness tracking
 * - Content management and authoring tools
 */

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

export {
  // Core troubleshooting types
  TroubleshootingContext,
  BrowserInfo,
  DeviceInfo,

  // Symptom checker types
  Symptom,
  SymptomCategory,
  SymptomSeverity,
  SymptomQuestion,
  QuestionType,
  SymptomCondition,
  ConditionOperator,
  SymptomAnalysis,

  // Troubleshooting guide types
  TroubleshootingGuide,
  TargetAudience,
  DifficultyLevel,
  TroubleshootingStep,
  StepType,
  StepCondition,
  StepAction,
  ActionType,
  ApiCall,
  ActionValidation,
  VerificationStep,
  VerificationType,
  AlternativeSolution,

  // Knowledge base types
  KnowledgeBaseEntry,
  ContentType,
  FAQ,

  // Wizard and session types
  WizardSession,
  WizardStep,
  WizardStepType,
  SessionProgress,
  SessionStatus,

  // Analytics and feedback types
  TroubleshootingAnalytics,
  AnalyticsAction,
  UserFeedback,
  SuccessMetrics,

  // Mobile-specific types
  MobileTroubleshootingGuide,
  MobileTroubleshootingContext,
  MobilePerformanceMetrics,
  NetworkEvent,

  // Content management types
  ContentManagementConfig,
  ContentAuthor,
  AuthorRole,
  AuthorPermission,
  ContentStatus,
  ContentReview,
  ReviewStatus,
  ReviewComment,

  // Configuration types
  TroubleshootingConfig,
  AnalyticsConfig,
  IntegrationConfig,
  SupportSystemConfig,
  EscalationRule,
} from "./types";

// ============================================================================
// MAIN TROUBLESHOOTING MANAGER
// ============================================================================

export {
  // Main troubleshooting manager
  TroubleshootingManager,

  // Utility functions
  createTroubleshootingManager,
  quickStartTroubleshooting,
} from "./troubleshooting-manager";

// ============================================================================
// SYMPTOM CHECKER
// ============================================================================

export {
  // Symptom checker
  SymptomChecker,

  // Utility functions
  createSymptomChecker,
} from "./symptom-checker";

// ============================================================================
// TROUBLESHOOTING WIZARD
// ============================================================================

export {
  // Troubleshooting wizard
  TroubleshootingWizard,

  // Step executors
  ButtonClickExecutor,
  FormSubmitExecutor,
  ApiCallExecutor,
  ScriptExecutor,
  NavigationExecutor,
  FileUploadExecutor,
  SettingsChangeExecutor,
  RefreshExecutor,
  ClearCacheExecutor,
} from "./troubleshooting-wizard";

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

export {
  // Knowledge base
  KnowledgeBase,

  // Utility functions
  createKnowledgeBase,
} from "./knowledge-base";

// ============================================================================
// GUIDANCE GENERATOR
// ============================================================================

export {
  // Guidance generator
  GuidanceGenerator,

  // Utility functions
  createGuidanceGenerator,
} from "./guidance-generator";

// ============================================================================
// REACT COMPONENTS (Placeholders - would be implemented separately)
// ============================================================================

/**
 * Troubleshooting Provider Component
 *
 * Provides troubleshooting context to the application
 */
export interface TroubleshootingProviderProps {
  children: React.ReactNode;
  config?: Partial<TroubleshootingConfig>;
  autoStart?: boolean;
}

export declare const TroubleshootingProvider: React.FC<TroubleshootingProviderProps>;

/**
 * Troubleshooting Modal Component
 *
 * Modal interface for the troubleshooting wizard
 */
export interface TroubleshootingModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorId?: string;
  errorCode?: string;
  initialStep?: string;
}

export declare const TroubleshootingModal: React.FC<TroubleshootingModalProps>;

/**
 * Symptom Checker Component
 *
 * Interactive symptom checker interface
 */
export interface SymptomCheckerProps {
  onAnalysisComplete: (analysis: SymptomAnalysis[]) => void;
  category?: SymptomCategory;
  initialAnswers?: Record<string, any>;
}

export declare const SymptomChecker: React.FC<SymptomCheckerProps>;

/**
 * Troubleshooting Wizard Component
 *
 * Main wizard interface for guided troubleshooting
 */
export interface TroubleshootingWizardProps {
  sessionId: string;
  onStepComplete?: (stepId: string, result: any) => void;
  onSessionComplete?: (success: boolean) => void;
  showProgress?: boolean;
  allowSkip?: boolean;
}

export declare const TroubleshootingWizard: React.FC<TroubleshootingWizardProps>;

/**
 * Knowledge Base Search Component
 *
 * Search interface for knowledge base content
 */
export interface KnowledgeBaseSearchProps {
  onResultSelect: (entry: KnowledgeBaseEntry) => void;
  category?: SymptomCategory;
  placeholder?: string;
  maxResults?: number;
}

export declare const KnowledgeBaseSearch: React.FC<KnowledgeBaseSearchProps>;

/**
 * FAQ Component
 *
 * FAQ display component with categorization
 */
export interface FAQProps {
  category?: SymptomCategory;
  limit?: number;
  expandable?: boolean;
  onHelpful?: (faqId: string, helpful: boolean) => void;
}

export declare const FAQ: React.FC<FAQProps>;

/**
 * Guide List Component
 *
 * Display list of troubleshooting guides
 */
export interface GuideListProps {
  guides: TroubleshootingGuide[];
  onGuideSelect: (guide: TroubleshootingGuide) => void;
  showDifficulty?: boolean;
  showDuration?: boolean;
  showSuccessRate?: boolean;
}

export declare const GuideList: React.FC<GuideListProps>;

/**
 * Feedback Component
 *
 * Feedback collection component for guides and sessions
 */
export interface FeedbackProps {
  sessionId?: string;
  guideId?: string;
  onSubmit: (feedback: UserFeedback) => void;
  showComment?: boolean;
  showContact?: boolean;
}

export declare const Feedback: React.FC<FeedbackProps>;

/**
 * Mobile Troubleshooting Component
 *
 * Mobile-optimized troubleshooting interface
 */
export interface MobileTroubleshootingProps {
  sessionId: string;
  onSessionComplete?: (success: boolean) => void;
  offlineMode?: boolean;
  touchOptimized?: boolean;
}

export declare const MobileTroubleshooting: React.FC<MobileTroubleshootingProps>;

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook for accessing troubleshooting manager
 */
export interface UseTroubleshootingManagerReturn {
  manager: TroubleshootingManager;
  createSession: (
    errorId?: string,
    errorCode?: string,
  ) => Promise<WizardSession>;
  getSession: (sessionId: string) => WizardSession | undefined;
  getKnowledgeBase: () => KnowledgeBase;
}

export declare function useTroubleshootingManager(
  config?: Partial<TroubleshootingConfig>,
): UseTroubleshootingManagerReturn;

/**
 * Hook for troubleshooting session management
 */
export interface UseTroubleshootingSessionReturn {
  session: WizardSession | null;
  loading: boolean;
  error: string | null;
  startSession: (errorId?: string, errorCode?: string) => Promise<string>;
  analyzeSymptoms: (answers: Record<string, any>) => Promise<SymptomAnalysis[]>;
  getGuides: () => Promise<TroubleshootingGuide[]>;
  executeStep: (
    stepId: string,
    parameters?: Record<string, any>,
  ) => Promise<any>;
  skipStep: (stepId: string) => Promise<void>;
  verifyResolution: (
    verificationData?: Record<string, any>,
  ) => Promise<boolean>;
  completeSession: (feedback?: any) => Promise<void>;
  abandonSession: (reason?: string) => Promise<void>;
}

export declare function useTroubleshootingSession(
  sessionId?: string,
  errorId?: string,
  errorCode?: string,
): UseTroubleshootingSessionReturn;

/**
 * Hook for symptom checking
 */
export interface UseSymptomCheckerReturn {
  questions: SymptomQuestion[];
  analyzeAnswers: (answers: Record<string, any>) => Promise<SymptomAnalysis[]>;
  getQuestionsForCategory: (category: SymptomCategory) => SymptomQuestion[];
  searchSymptoms: (
    query: string,
    category?: SymptomCategory,
  ) => Promise<Symptom[]>;
}

export declare function useSymptomChecker(
  category?: SymptomCategory,
): UseSymptomCheckerReturn;

/**
 * Hook for knowledge base access
 */
export interface UseKnowledgeBaseReturn {
  search: (
    query: string,
    category?: SymptomCategory,
    limit?: number,
  ) => Promise<KnowledgeBaseEntry[]>;
  getFAQs: (category?: SymptomCategory, limit?: number) => Promise<FAQ[]>;
  getEntry: (id: string) => Promise<KnowledgeBaseEntry | undefined>;
  getPopular: (
    category?: SymptomCategory,
    limit?: number,
  ) => Promise<KnowledgeBaseEntry[]>;
  getRecent: (
    category?: SymptomCategory,
    limit?: number,
  ) => Promise<KnowledgeBaseEntry[]>;
  getByTags: (
    tags: string[],
    category?: SymptomCategory,
    limit?: number,
  ) => Promise<KnowledgeBaseEntry[]>;
  recordFeedback: (entryId: string, feedback: UserFeedback) => Promise<void>;
}

export declare function useKnowledgeBase(): UseKnowledgeBaseReturn;

/**
 * Hook for mobile-specific troubleshooting
 */
export interface UseMobileTroubleshootingReturn {
  isMobile: boolean;
  deviceInfo: DeviceInfo | null;
  getMobileGuides: (sessionId: string) => Promise<MobileTroubleshootingGuide[]>;
  optimizeForMobile: (
    guide: TroubleshootingGuide,
  ) => Promise<MobileTroubleshootingGuide>;
  checkMobileCapabilities: () => Promise<Record<string, boolean>>;
}

export declare function useMobileTroubleshooting(): UseMobileTroubleshootingReturn;

/**
 * Hook for troubleshooting analytics
 */
export interface UseTroubleshootingAnalyticsReturn {
  getSuccessMetrics: (timeRange?: {
    start: Date;
    end: Date;
  }) => Promise<SuccessMetrics>;
  getGuideAnalytics: () => Promise<
    Array<{
      guideId: string;
      usage: number;
      successRate: number;
      performance: "excellent" | "good" | "average" | "poor";
    }>
  >;
  trackEvent: (sessionId: string, action: AnalyticsAction, data?: any) => void;
  getPopularGuides: (limit?: number) => Promise<TroubleshootingGuide[]>;
  getCommonSymptoms: (limit?: number) => Promise<SymptomAnalysis[]>;
}

export declare function useTroubleshootingAnalytics(): UseTroubleshootingAnalyticsReturn;

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Integration with existing error handling system
 */
export interface ErrorHandlingIntegration {
  /**
   * Start troubleshooting from an error
   */
  troubleshootError: (
    error: Error,
    context?: Record<string, any>,
  ) => Promise<{ sessionId: string; guides: TroubleshootingGuide[] }>;

  /**
   * Add troubleshooting button to error display
   */
  addTroubleshootingButton: (errorElement: HTMLElement, error: Error) => void;

  /**
   * Auto-start troubleshooting for critical errors
   */
  autoStartForError: (error: Error, autoStart: boolean) => Promise<boolean>;
}

/**
 * Create error handling integration
 */
export declare function createErrorHandlingIntegration(
  config?: Partial<TroubleshootingConfig>,
): ErrorHandlingIntegration;

/**
 * Integration with TanStack Query
 */
export interface TanStackQueryIntegration {
  /**
   * Create enhanced query with troubleshooting
   */
  createQueryWithTroubleshooting: <T>(options: any, errorId?: string) => any;

  /**
   * Create enhanced mutation with troubleshooting
   */
  createMutationWithTroubleshooting: <T>(options: any, errorId?: string) => any;

  /**
   * Add troubleshooting to existing query client
   */
  enhanceQueryClient: (queryClient: any) => void;
}

/**
 * Create TanStack Query integration
 */
export declare function createTanStackQueryIntegration(
  troubleshootingManager: TroubleshootingManager,
): TanStackQueryIntegration;

// ============================================================================
// CONSTANTS AND DEFAULTS
// ============================================================================

/**
 * Default troubleshooting configuration
 */
export declare const DEFAULT_TROUBLESHOOTING_CONFIG: TroubleshootingConfig;

/**
 * Default categories for symptom organization
 */
export declare const DEFAULT_SYMPTOM_CATEGORIES: SymptomCategory[];

/**
 * Default question types for symptom checking
 */
export declare const DEFAULT_QUESTION_TYPES: QuestionType[];

/**
 * Default step types for troubleshooting guides
 */
export declare const DEFAULT_STEP_TYPES: StepType[];

/**
 * Default action types for automated steps
 */
export declare const DEFAULT_ACTION_TYPES: ActionType[];

/**
 * Default verification types for guide completion
 */
export declare const DEFAULT_VERIFICATION_TYPES: VerificationType[];

/**
 * Default target audiences for guides
 */
export declare const DEFAULT_TARGET_AUDIENCES: TargetAudience[];

/**
 * Default difficulty levels for guides
 */
export declare const DEFAULT_DIFFICULTY_LEVELS: DifficultyLevel[];

/**
 * Default content types for knowledge base
 */
export declare const DEFAULT_CONTENT_TYPES: ContentType[];

/**
 * Default analytics actions for tracking
 */
export declare const DEFAULT_ANALYTICS_ACTIONS: AnalyticsAction[];

// ============================================================================
// VERSION AND METADATA
// ============================================================================

export const TROUBLESHOOTING_SYSTEM_VERSION = "1.0.0";
export const TROUBLESHOOTING_SYSTEM_BUILD_DATE = new Date().toISOString();

/**
 * Get system information
 */
export function getTroubleshootingSystemInfo() {
  return {
    version: TROUBLESHOOTING_SYSTEM_VERSION,
    buildDate: TROUBLESHOOTING_SYSTEM_BUILD_DATE,
    components: {
      TroubleshootingManager: true,
      SymptomChecker: true,
      TroubleshootingWizard: true,
      KnowledgeBase: true,
      GuidanceGenerator: true,
    },
    features: {
      symptomChecking: true,
      guidedResolution: true,
      knowledgeBase: true,
      mobileSupport: true,
      analytics: true,
      contentManagement: true,
      errorIntegration: true,
      reactComponents: true,
    },
  };
}

/**
 * Development helper to enable debug mode
 */
export function enableTroubleshootingDebugMode(): void {
  if (typeof window !== "undefined") {
    (window as any).__TROUBLESHOOTING_DEBUG__ = true;
  }
}

/**
 * Check if debug mode is enabled
 */
export function isTroubleshootingDebugMode(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as any).__TROUBLESHOOTING_DEBUG__ === true
  );
}

/**
 * Development helper to log debug information
 */
export function debugTroubleshooting(message: string, data?: any): void {
  if (isTroubleshootingDebugMode()) {
    console.log(`[Troubleshooting] ${message}`, data);
  }
}

// ============================================================================
// QUICK START HELPERS
// ============================================================================

/**
 * Quick start troubleshooting for development
 */
export async function quickStartTroubleshootingForDev(
  errorId?: string,
  errorCode?: string,
): Promise<{
  manager: TroubleshootingManager;
  sessionId: string;
  session: WizardSession;
}> {
  enableTroubleshootingDebugMode();

  const manager = createTroubleshootingManager({
    collectAnalytics: false,
    content: {
      approvalRequired: false,
      versionControl: false,
    },
  });

  const { sessionId, session } = await quickStartTroubleshooting(
    errorId,
    errorCode,
  );

  debugTroubleshooting("Quick start troubleshooting session created", {
    sessionId,
    errorId,
    errorCode,
  });

  return {
    manager,
    sessionId,
    session,
  };
}

/**
 * Quick setup for production
 */
export function quickSetupForProduction(
  configOverrides?: Partial<TroubleshootingConfig>,
): {
  manager: TroubleshootingManager;
  integration: ErrorHandlingIntegration;
  queryIntegration: TanStackQueryIntegration;
} {
  const manager = createTroubleshootingManager({
    ...configOverrides,
    analytics: {
      enabled: true,
      collectUserAgent: true,
      collectDeviceInfo: true,
      collectNetworkInfo: true,
      collectPerformanceMetrics: true,
      retentionPeriod: 30,
      anonymizeData: true,
      consentRequired: true,
    },
    integration: {
      errorClassification: true,
      recoveryStrategies: true,
      errorMiddleware: true,
      tanStackQuery: true,
      errorAnalytics: true,
      errorLogging: true,
      monitoring: true,
      supportSystems: [],
    },
  });

  const integration = createErrorHandlingIntegration(manager.getConfig());
  const queryIntegration = createTanStackQueryIntegration(manager);

  return {
    manager,
    integration,
    queryIntegration,
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Basic troubleshooting usage
 */
export async function exampleBasicUsage() {
  // Create troubleshooting manager
  const manager = createTroubleshootingManager();

  // Start troubleshooting session
  const session = await manager.createSession(
    "audio_playback_error",
    "AUDIO_NO_SOUND",
  );

  // Analyze symptoms
  const analysis = await manager.analyzeSymptoms(session.id, {
    device_volume: true,
    other_apps_audio: true,
    headphones: false,
    browser_permissions: "unknown",
  });

  // Get recommended guides
  const guides = await manager.getRecommendedGuides(session.id);

  // Execute first step of first guide
  if (guides.length > 0 && guides[0].steps.length > 0) {
    const result = await manager.executeStep(session.id, guides[0].steps[0].id);
    console.log("Step result:", result);
  }

  // Verify resolution
  const isResolved = await manager.verifyResolution(session.id);

  // Complete session
  await manager.completeSession(session.id, {
    rating: 5,
    helpful: true,
    wouldRecommend: true,
  });

  return {
    analysis,
    guides,
    isResolved,
  };
}

/**
 * Example: React component usage
 */
export const exampleReactUsage = `
import React, { useState } from 'react';
import {
  TroubleshootingProvider,
  TroubleshootingModal,
  useTroubleshootingSession
} from '@/lib/errors/troubleshooting';

function ErrorDisplay({ error }) {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const { startSession, analyzeSymptoms, getGuides } = useTroubleshootingSession();

  const handleTroubleshoot = async () => {
    const sessionId = await startSession('custom_error', error.code);
    setShowTroubleshooting(true);
  };

  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={handleTroubleshoot}>
        Troubleshoot This Error
      </button>

      <TroubleshootingModal
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
        errorId="custom_error"
        errorCode={error.code}
      />
    </div>
  );
}

function App() {
  return (
    <TroubleshootingProvider>
      <ErrorDisplay error={new Error('Something went wrong')} />
    </TroubleshootingProvider>
  );
}
`;

/**
 * Example: Integration with existing error handling
 */
export const exampleErrorIntegration = `
import { handleError } from '@/lib/utils/error-handler';
import { createErrorHandlingIntegration } from '@/lib/errors/troubleshooting';

const troubleshooting = createErrorHandlingIntegration();

// Enhanced error handling with troubleshooting
export async function enhancedHandleError(error, context) {
  // Handle error normally
  const result = await handleError(error, context);

  // Offer troubleshooting for certain errors
  if (shouldOfferTroubleshooting(error)) {
    const { sessionId, guides } = await troubleshooting.troubleshootError(error, context);
    result.troubleshootingSession = sessionId;
    result.recommendedGuides = guides;
  }

  return result;
}

function shouldOfferTroubleshooting(error) {
  return error.category === 'AUDIO_PLAYBACK' ||
         error.category === 'FILE_UPLOAD' ||
         error.category === 'TRANSCRIPTION';
}
`;

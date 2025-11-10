/**
 * React Hooks for Troubleshooting System
 *
 * Custom React hooks that provide easy access to troubleshooting functionality
 * within React components, with proper state management and error handling.
 */

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  TroubleshootingManager,
  createTroubleshootingManager,
  quickStartTroubleshooting,
} from './troubleshooting-manager';
import {
  SymptomChecker,
  createSymptomChecker,
} from './symptom-checker';
import {
  KnowledgeBase,
  createKnowledgeBase,
} from './knowledge-base';
import {
  GuidanceGenerator,
  createGuidanceGenerator,
} from './guidance-generator';
import {
  TroubleshootingContext as TroubleshootingContextType,
  WizardSession,
  SymptomAnalysis,
  TroubleshootingGuide,
  KnowledgeBaseEntry,
  FAQ,
  SymptomCategory,
  SymptomQuestion,
  UserFeedback,
  SuccessMetrics,
  DeviceInfo,
  MobileTroubleshootingGuide,
  AnalyticsAction,
  TroubleshootingConfig,
} from './types';

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

/**
 * React context for troubleshooting system
 */
const TroubleshootingSystemContext = createContext<{
  manager: TroubleshootingManager | null;
  config: TroubleshootingConfig;
  isInitialized: boolean;
}>({
  manager: null,
  config: {} as TroubleshootingConfig,
  isInitialized: false,
});

/**
 * Props for troubleshooting provider
 */
interface TroubleshootingProviderProps {
  children: React.ReactNode;
  config?: Partial<TroubleshootingConfig>;
  autoInitialize?: boolean;
}

/**
 * Troubleshooting provider component
 */
export const TroubleshootingProvider: React.FC<TroubleshootingProviderProps> = ({
  children,
  config: configOverrides,
  autoInitialize = true,
}) => {
  const [manager, setManager] = useState<TroubleshootingManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const configRef = useRef<TroubleshootingConfig>();

  // Initialize troubleshooting system
  useEffect(() => {
    if (!autoInitialize) return;

    const initializeSystem = async () => {
      try {
        const finalConfig = {
          enabled: true,
          autoStart: false,
          collectAnalytics: true,
          enableMobile: true,
          enableOffline: true,
          language: 'en',
          theme: 'auto',
          maxSessionDuration: 60,
          cacheSize: 100,
          analytics: {
            enabled: true,
            collectUserAgent: true,
            collectDeviceInfo: true,
            collectNetworkInfo: true,
            collectPerformanceMetrics: true,
            retentionPeriod: 30,
            anonymizeData: true,
            consentRequired: false,
          },
          content: {
            approvalRequired: false,
            versionControl: true,
            multiLanguage: false,
            autoTranslation: false,
            contentReview: true,
            analytics: true,
            search: true,
            categorization: true,
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
          ...configOverrides,
        };

        configRef.current = finalConfig;
        const troubleshootingManager = createTroubleshootingManager(finalConfig);

        setManager(troubleshootingManager);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize troubleshooting system:', error);
        setIsInitialized(false);
      }
    };

    initializeSystem();

    return () => {
      if (manager) {
        manager.destroy();
      }
    };
  }, [autoInitialize, configOverrides]);

  const value = {
    manager,
    config: configRef.current || ({} as TroubleshootingConfig),
    isInitialized,
  };

  return (
    <TroubleshootingSystemContext.Provider value={value}>
      {children}
    </TroubleshootingSystemContext.Provider>
  );
};

// ============================================================================
// MAIN TROUBLESHOOTING MANAGER HOOK
// ============================================================================

/**
 * Hook for accessing troubleshooting manager
 */
export function useTroubleshootingManager(
  config?: Partial<TroubleshootingConfig>
): {
  manager: TroubleshootingManager;
  createSession: (errorId?: string, errorCode?: string) => Promise<WizardSession>;
  getKnowledgeBase: () => KnowledgeBase;
  isInitialized: boolean;
} {
  const context = useContext(TroubleshootingSystemContext);
  const [localManager, setLocalManager] = useState<TroubleshootingManager | null>(null);

  // Use context manager if available, otherwise create local one
  const manager = context?.manager || localManager;
  const isInitialized = context?.isInitialized || !!localManager;

  // Create local manager if none exists and config provided
  useEffect(() => {
    if (!manager && config && !context?.manager) {
      const newManager = createTroubleshootingManager(config);
      setLocalManager(newManager);

      return () => {
        newManager.destroy();
      };
    }
  }, [manager, config, context?.manager]);

  const createSession = useCallback(async (
    errorId?: string,
    errorCode?: string
  ): Promise<WizardSession> => {
    if (!manager) {
      throw new Error('Troubleshooting manager not initialized');
    }
    return manager.createSession(errorId, errorCode);
  }, [manager]);

  const getKnowledgeBase = useCallback((): KnowledgeBase => {
    if (!manager) {
      throw new Error('Troubleshooting manager not initialized');
    }
    // Return knowledge base instance from manager (would need to expose it)
    return createKnowledgeBase(manager.getConfig());
  }, [manager]);

  if (!manager) {
    throw new Error('Troubleshooting manager not available. Ensure TroubleshootingProvider is used or config is provided.');
  }

  return {
    manager,
    createSession,
    getKnowledgeBase,
    isInitialized,
  };
}

// ============================================================================
// TROUBLESHOOTING SESSION HOOK
// ============================================================================

/**
 * Hook for troubleshooting session management
 */
export function useTroubleshootingSession(
  sessionId?: string,
  errorId?: string,
  errorCode?: string
): {
  session: WizardSession | null;
  loading: boolean;
  error: string | null;
  startSession: (errorId?: string, errorCode?: string) => Promise<string>;
  analyzeSymptoms: (answers: Record<string, any>) => Promise<SymptomAnalysis[]>;
  getGuides: () => Promise<TroubleshootingGuide[]>;
  executeStep: (stepId: string, parameters?: Record<string, any>) => Promise<any>;
  skipStep: (stepId: string) => Promise<void>;
  verifyResolution: (verificationData?: Record<string, any>) => Promise<boolean>;
  completeSession: (feedback?: any) => Promise<void>;
  abandonSession: (reason?: string) => Promise<void>;
} {
  const { manager } = useTroubleshootingManager();
  const [session, setSession] = useState<WizardSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSessionId = useRef<string | undefined>(sessionId);

  // Load existing session if sessionId provided
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId.current) {
      const existingSession = manager.getSession(sessionId);
      if (existingSession) {
        setSession(existingSession);
        currentSessionId.current = sessionId;
      }
    }
  }, [sessionId, manager]);

  const startSession = useCallback(async (
    newErrorId?: string,
    newErrorCode?: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await manager.createSession(
        newErrorId || errorId,
        newErrorCode || errorCode
      );
      setSession(newSession);
      currentSessionId.current = newSession.id;
      return newSession.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, errorId, errorCode]);

  const analyzeSymptoms = useCallback(async (
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> => {
    if (!session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const analysis = await manager.analyzeSymptoms(session.id, answers);
      // Update session with analysis
      const updatedSession = manager.getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze symptoms';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  const getGuides = useCallback(async (): Promise<TroubleshootingGuide[]> => {
    if (!session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const guides = await manager.getRecommendedGuides(session.id);
      return guides;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get guides';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  const executeStep = useCallback(async (
    stepId: string,
    parameters?: Record<string, any>
  ): Promise<any> => {
    if (!session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await manager.executeStep(session.id, stepId, parameters);
      // Update session
      const updatedSession = manager.getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  const skipStep = useCallback(async (stepId: string): Promise<void> => {
    if (!session) {
      throw new Error('No active session');
    }

    try {
      await manager.skipStep(session.id, stepId);
      // Update session
      const updatedSession = manager.getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip step';
      setError(errorMessage);
      throw err;
    }
  }, [manager, session]);

  const verifyResolution = useCallback(async (
    verificationData?: Record<string, any>
  ): Promise<boolean> => {
    if (!session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const isResolved = await manager.verifyResolution(session.id, verificationData);
      return isResolved;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify resolution';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  const completeSession = useCallback(async (feedback?: any): Promise<void> => {
    if (!session) {
      throw new Error('No active session');
    }

    try {
      await manager.completeSession(session.id, feedback);
      setSession(null);
      currentSessionId.current = undefined;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete session';
      setError(errorMessage);
      throw err;
    }
  }, [manager, session]);

  const abandonSession = useCallback(async (reason?: string): Promise<void> => {
    if (!session) {
      return;
    }

    try {
      await manager.abandonSession(session.id, reason);
      setSession(null);
      currentSessionId.current = undefined;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to abandon session';
      setError(errorMessage);
      throw err;
    }
  }, [manager, session]);

  return {
    session,
    loading,
    error,
    startSession,
    analyzeSymptoms,
    getGuides,
    executeStep,
    skipStep,
    verifyResolution,
    completeSession,
    abandonSession,
  };
}

// ============================================================================
// SYMPTOM CHECKER HOOK
// ============================================================================

/**
 * Hook for symptom checking
 */
export function useSymptomChecker(
  category?: SymptomCategory
): {
  questions: SymptomQuestion[];
  analyzeAnswers: (answers: Record<string, any>) => Promise<SymptomAnalysis[]>;
  getQuestionsForCategory: (category: SymptomCategory) => SymptomQuestion[];
  searchSymptoms: (query: string, category?: SymptomCategory) => Promise<any[]>;
} {
  const { manager } = useTroubleshootingManager();
  const [symptomChecker] = useState(() => createSymptomChecker(manager.getConfig()));

  const [questions, setQuestions] = useState<SymptomQuestion[]>([]);

  // Load questions for category
  useEffect(() => {
    if (category) {
      const categoryQuestions = symptomChecker.getQuestionsForCategory(category);
      setQuestions(categoryQuestions);
    } else {
      // Get questions from all categories
      const allQuestions: SymptomQuestion[] = [];
      Object.values(SymptomCategory).forEach(cat => {
        allQuestions.push(...symptomChecker.getQuestionsForCategory(cat));
      });
      setQuestions(allQuestions);
    }
  }, [category, symptomChecker]);

  const analyzeAnswers = useCallback(async (
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> => {
    // Create a minimal context for analysis
    const context: TroubleshootingContextType = {
      sessionId: 'temp',
      startTime: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      isMobile: typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    };

    return symptomChecker.analyzeSymptoms(context, answers);
  }, [symptomChecker]);

  const getQuestionsForCategory = useCallback((cat: SymptomCategory): SymptomQuestion[] => {
    return symptomChecker.getQuestionsForCategory(cat);
  }, [symptomChecker]);

  const searchSymptoms = useCallback(async (
    query: string,
    searchCategory?: SymptomCategory
  ): Promise<any[]> => {
    return symptomChecker.searchSymptoms(query, searchCategory);
  }, [symptomChecker]);

  return {
    questions,
    analyzeAnswers,
    getQuestionsForCategory,
    searchSymptoms,
  };
}

// ============================================================================
// KNOWLEDGE BASE HOOK
// ============================================================================

/**
 * Hook for knowledge base access
 */
export function useKnowledgeBase(): {
  search: (query: string, category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getFAQs: (category?: SymptomCategory, limit?: number) => Promise<FAQ[]>;
  getEntry: (id: string) => Promise<KnowledgeBaseEntry | undefined>;
  getPopular: (category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getRecent: (category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getByTags: (tags: string[], category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  recordFeedback: (entryId: string, feedback: UserFeedback) => Promise<void>;
} {
  const { manager } = useTroubleshootingManager();
  const [knowledgeBase] = useState(() => createKnowledgeBase(manager.getConfig()));

  const search = useCallback(async (
    query: string,
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    return knowledgeBase.search(query, category, limit);
  }, [knowledgeBase]);

  const getFAQs = useCallback(async (
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<FAQ[]> => {
    return knowledgeBase.getFAQs(category, limit);
  }, [knowledgeBase]);

  const getEntry = useCallback(async (id: string): Promise<KnowledgeBaseEntry | undefined> => {
    return knowledgeBase.getEntry(id);
  }, [knowledgeBase]);

  const getPopular = useCallback(async (
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    return knowledgeBase.getPopularEntries(category, limit);
  }, [knowledgeBase]);

  const getRecent = useCallback(async (
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    return knowledgeBase.getRecentEntries(category, limit);
  }, [knowledgeBase]);

  const getByTags = useCallback(async (
    tags: string[],
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<KnowledgeBaseEntry[]> => {
    return knowledgeBase.getEntriesByTags(tags, category, limit);
  }, [knowledgeBase]);

  const recordFeedback = useCallback(async (
    entryId: string,
    feedback: UserFeedback
  ): Promise<void> => {
    return knowledgeBase.recordFeedback(feedback);
  }, [knowledgeBase]);

  return {
    search,
    getFAQs,
    getEntry,
    getPopular,
    getRecent,
    getByTags,
    recordFeedback,
  };
}

// ============================================================================
// MOBILE TROUBLESHOOTING HOOK
// ============================================================================

/**
 * Hook for mobile-specific troubleshooting
 */
export function useMobileTroubleshooting(): {
  isMobile: boolean;
  deviceInfo: DeviceInfo | null;
  getMobileGuides: (sessionId: string) => Promise<MobileTroubleshootingGuide[]>;
  optimizeForMobile: (guide: TroubleshootingGuide) => Promise<MobileTroubleshootingGuide>;
  checkMobileCapabilities: () => Promise<Record<string, boolean>>;
} {
  const { manager } = useTroubleshootingManager();
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Check if mobile and get device info
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(mobile);

      if (mobile) {
        const info: DeviceInfo = {
          type: /iPad/i.test(navigator.userAgent) ? 'tablet' : 'mobile',
          os: getOperatingSystem(),
          osVersion: getOperatingSystemVersion(),
          screenResolution: `${screen.width}x${screen.height}`,
          pixelRatio: window.devicePixelRatio,
          colorDepth: screen.colorDepth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        };
        setDeviceInfo(info);
      }
    };

    checkMobile();
  }, []);

  const getMobileGuides = useCallback(async (sessionId: string): Promise<MobileTroubleshootingGuide[]> => {
    const session = manager.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Create mobile context
    const mobileContext = {
      ...session.context,
      deviceInfo: deviceInfo || undefined,
    } as any;

    return manager.getMobileGuidance(sessionId, mobileContext);
  }, [manager, deviceInfo]);

  const optimizeForMobile = useCallback(async (
    guide: TroubleshootingGuide
  ): Promise<MobileTroubleshootingGuide> => {
    // Convert regular guide to mobile guide
    return {
      ...guide,
      mobileSpecific: true,
      deviceTypes: ['ios', 'android', 'both'],
      appVersions: {
        min: '1.0.0',
      },
      touchOptimized: true,
      offlineAvailable: false,
      batteryConsiderations: true,
      networkOptimizations: true,
      storageRequirements: 50,
    };
  }, []);

  const checkMobileCapabilities = useCallback(async (): Promise<Record<string, boolean>> => {
    return {
      touchScreen: 'ontouchstart' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      vibration: 'vibrate' in navigator,
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      indexedDB: 'indexedDB' in window,
      webGL: checkWebGL(),
      webAudio: checkWebAudio(),
      orientation: 'orientation' in window,
      fullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
    };
  }, []);

  return {
    isMobile,
    deviceInfo,
    getMobileGuides,
    optimizeForMobile,
    checkMobileCapabilities,
  };
}

// ============================================================================
// TROUBLESHOOTING ANALYTICS HOOK
// ============================================================================

/**
 * Hook for troubleshooting analytics
 */
export function useTroubleshootingAnalytics(): {
  getSuccessMetrics: (timeRange?: { start: Date; end: Date }) => Promise<SuccessMetrics>;
  getGuideAnalytics: () => Promise<Array<{
    guideId: string;
    usage: number;
    successRate: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>>;
  trackEvent: (sessionId: string, action: AnalyticsAction, data?: any) => void;
  getPopularGuides: (limit?: number) => Promise<TroubleshootingGuide[]>;
  getCommonSymptoms: (limit?: number) => Promise<SymptomAnalysis[]>;
} {
  const { manager } = useTroubleshootingManager();

  const getSuccessMetrics = useCallback(async (
    timeRange?: { start: Date; end: Date }
  ): Promise<SuccessMetrics> => {
    return manager.getSuccessMetrics(timeRange);
  }, [manager]);

  const getGuideAnalytics = useCallback(async () => {
    // This would need to be implemented in the manager
    return [];
  }, [manager]);

  const trackEvent = useCallback((
    sessionId: string,
    action: AnalyticsAction,
    data?: any
  ): void => {
    // This would need to be implemented in the manager
    console.log('Tracking analytics event:', { sessionId, action, data });
  }, []);

  const getPopularGuides = useCallback(async (limit: number = 10): Promise<TroubleshootingGuide[]> => {
    // This would need to be implemented with guide popularity tracking
    return [];
  }, []);

  const getCommonSymptoms = useCallback(async (limit: number = 10): Promise<SymptomAnalysis[]> => {
    // This would need to be implemented with symptom frequency tracking
    return [];
  }, []);

  return {
    getSuccessMetrics,
    getGuideAnalytics,
    trackEvent,
    getPopularGuides,
    getCommonSymptoms,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get operating system
 */
function getOperatingSystem(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Get operating system version
 */
function getOperatingSystemVersion(): string {
  const ua = navigator.userAgent;
  const match = ua.match(/(Windows NT|Mac OS X|Android|iOS) ([\d._]+)/);
  return match ? match[2] : 'Unknown';
}

/**
 * Check localStorage availability
 */
function checkLocalStorage(): boolean {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check sessionStorage availability
 */
function checkSessionStorage(): boolean {
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check WebGL availability
 */
function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Check Web Audio API availability
 */
function checkWebAudio(): boolean {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
}

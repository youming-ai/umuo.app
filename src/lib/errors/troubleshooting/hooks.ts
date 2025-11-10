/**
 * Troubleshooting React Hooks
 *
 * React hooks for integrating the troubleshooting system with React applications.
 * Provides easy access to troubleshooting functionality from components.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TroubleshootingManager,
  SymptomChecker,
  KnowledgeBase,
  GuidanceGenerator,
  createTroubleshootingManager,
  createSymptomChecker,
  createKnowledgeBase,
  createGuidanceGenerator,
} from './index';
import {
  TroubleshootingConfig,
  TroubleshootingContext,
  WizardSession,
  SymptomAnalysis,
  SymptomQuestion,
  SymptomCategory,
  TroubleshootingGuide,
  KnowledgeBaseEntry,
  FAQ,
  UserFeedback,
  SuccessMetrics,
  AnalyticsAction,
  TroubleshootingAnalytics,
  DeviceInfo,
  MobileTroubleshootingGuide,
} from './types';

// ============================================================================
// TROUBLESHOOTING MANAGER HOOK
// ============================================================================

/**
 * Hook for accessing troubleshooting manager
 */
export function useTroubleshootingManager(
  config?: Partial<TroubleshootingConfig>
) {
  const managerRef = useRef<TroubleshootingManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = createTroubleshootingManager(config);
      setIsInitialized(true);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, []);

  const createSession = useCallback(async (
    errorId?: string,
    errorCode?: string
  ): Promise<WizardSession> => {
    if (!managerRef.current) {
      throw new Error('Troubleshooting manager not initialized');
    }
    return managerRef.current.createSession(errorId, errorCode);
  }, []);

  const getSession = useCallback((sessionId: string): WizardSession | undefined => {
    if (!managerRef.current) {
      return undefined;
    }
    return managerRef.current.getSession(sessionId);
  }, []);

  const getKnowledgeBase = useCallback((): KnowledgeBase => {
    if (!managerRef.current) {
      throw new Error('Troubleshooting manager not initialized');
    }
    // This would need to be exposed from the manager
    return new KnowledgeBase(managerRef.current.getConfig());
  }, []);

  return useMemo(() => ({
    manager: managerRef.current,
    createSession,
    getSession,
    getKnowledgeBase,
    isInitialized,
  }), [createSession, getSession, getKnowledgeBase, isInitialized]);
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
  errorCode?: string,
  config?: Partial<TroubleshootingConfig>
) {
  const { manager, createSession, getSession, isInitialized } = useTroubleshootingManager(config);
  const [session, setSession] = useState<WizardSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    if (!isInitialized || !manager) return;

    const initializeSession = async () => {
      setLoading(true);
      setError(null);

      try {
        let currentSession: WizardSession;

        if (sessionId) {
          // Load existing session
          const existingSession = getSession(sessionId);
          if (existingSession) {
            currentSession = existingSession;
          } else {
            throw new Error(`Session ${sessionId} not found`);
          }
        } else {
          // Create new session
          currentSession = await createSession(errorId, errorCode);
        }

        setSession(currentSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [sessionId, errorId, errorCode, isInitialized, manager, createSession, getSession]);

  const analyzeSymptoms = useCallback(async (
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> => {
    if (!manager || !session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const analysis = await manager.analyzeSymptoms(session.id, answers);
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
    if (!manager || !session) {
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
    if (!manager || !session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await manager.executeStep(session.id, stepId, parameters);

      // Update session state
      const updatedSession = getSession(session.id);
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
  }, [manager, session, getSession]);

  const skipStep = useCallback(async (stepId: string): Promise<void> => {
    if (!manager || !session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      await manager.skipStep(session.id, stepId);

      // Update session state
      const updatedSession = getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session, getSession]);

  const verifyResolution = useCallback(async (
    verificationData?: Record<string, any>
  ): Promise<boolean> => {
    if (!manager || !session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const isResolved = await manager.verifyResolution(session.id, verificationData);

      // Update session state
      const updatedSession = getSession(session.id);
      if (updatedSession) {
        setSession(updatedSession);
      }

      return isResolved;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify resolution';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session, getSession]);

  const completeSession = useCallback(async (feedback?: any): Promise<void> => {
    if (!manager || !session) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      await manager.completeSession(session.id, feedback);
      setSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  const abandonSession = useCallback(async (reason?: string): Promise<void> => {
    if (!manager || !session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await manager.abandonSession(session.id, reason);
      setSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to abandon session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [manager, session]);

  return useMemo(() => ({
    session,
    loading,
    error,
    startSession: createSession,
    analyzeSymptoms,
    getGuides,
    executeStep,
    skipStep,
    verifyResolution,
    completeSession,
    abandonSession,
  }), [
    session,
    loading,
    error,
    createSession,
    analyzeSymptoms,
    getGuides,
    executeStep,
    skipStep,
    verifyResolution,
    completeSession,
    abandonSession,
  ]);
}

// ============================================================================
// SYMPTOM CHECKER HOOK
// ============================================================================

/**
 * Hook for symptom checking
 */
export function useSymptomChecker(category?: SymptomCategory) {
  const [symptomChecker, setSymptomChecker] = useState<SymptomChecker | null>(null);
  const [questions, setQuestions] = useState<SymptomQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checker = createSymptomChecker();
    setSymptomChecker(checker);

    if (category) {
      const categoryQuestions = checker.getQuestionsForCategory(category);
      setQuestions(categoryQuestions);
    } else {
      const allQuestions = checker.getAllSymptoms()
        .flatMap(symptom => symptom.questions)
        .filter((question, index, self) =>
          self.findIndex(q => q.id === question.id) === index
        )
        .sort((a, b) => b.weight - a.weight);
      setQuestions(allQuestions);
    }

    return () => {
      checker.destroy();
    };
  }, [category]);

  const analyzeAnswers = useCallback(async (
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> => {
    if (!symptomChecker) {
      throw new Error('Symptom checker not initialized');
    }

    setLoading(true);

    try {
      // Create a mock context for analysis
      const context: TroubleshootingContext = {
        sessionId: 'temp',
        startTime: new Date(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ),
      };

      const analysis = await symptomChecker.analyzeSymptoms(context, answers);
      return analysis;
    } finally {
      setLoading(false);
    }
  }, [symptomChecker]);

  const getQuestionsForCategory = useCallback((cat: SymptomCategory): SymptomQuestion[] => {
    if (!symptomChecker) {
      return [];
    }
    return symptomChecker.getQuestionsForCategory(cat);
  }, [symptomChecker]);

  const searchSymptoms = useCallback(async (
    query: string,
    cat?: SymptomCategory
  ): Promise<any[]> => {
    if (!symptomChecker) {
      return [];
    }
    return symptomChecker.searchSymptoms(query, cat);
  }, [symptomChecker]);

  return useMemo(() => ({
    questions,
    loading,
    analyzeAnswers,
    getQuestionsForCategory,
    searchSymptoms,
  }), [questions, loading, analyzeAnswers, getQuestionsForCategory, searchSymptoms]);
}

// ============================================================================
// KNOWLEDGE BASE HOOK
// ============================================================================

/**
 * Hook for knowledge base access
 */
export function useKnowledgeBase() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const kb = createKnowledgeBase();
    setKnowledgeBase(kb);

    return () => {
      kb.destroy();
    };
  }, []);

  const search = useCallback(async (
    query: string,
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    if (!knowledgeBase) {
      return [];
    }

    setLoading(true);

    try {
      const results = await knowledgeBase.search(query, category, limit);
      return results;
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const getFAQs = useCallback(async (
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<FAQ[]> => {
    if (!knowledgeBase) {
      return [];
    }

    setLoading(true);

    try {
      const faqs = await knowledgeBase.getFAQs(category, limit);
      return faqs;
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const getEntry = useCallback(async (id: string): Promise<KnowledgeBaseEntry | undefined> => {
    if (!knowledgeBase) {
      return undefined;
    }

    setLoading(true);

    try {
      return knowledgeBase.getEntry(id);
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const getPopular = useCallback(async (
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    if (!knowledgeBase) {
      return [];
    }

    setLoading(true);

    try {
      const entries = await knowledgeBase.getPopularEntries(category, limit);
      return entries;
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const getRecent = useCallback(async (
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> => {
    if (!knowledgeBase) {
      return [];
    }

    setLoading(true);

    try {
      const entries = await knowledgeBase.getRecentEntries(category, limit);
      return entries;
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const getByTags = useCallback(async (
    tags: string[],
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<KnowledgeBaseEntry[]> => {
    if (!knowledgeBase) {
      return [];
    }

    setLoading(true);

    try {
      const entries = await knowledgeBase.getEntriesByTags(tags, category, limit);
      return entries;
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase]);

  const recordFeedback = useCallback(async (
    entryId: string,
    feedback: UserFeedback
  ): Promise<void> => {
    if (!knowledgeBase) {
      return;
    }

    await knowledgeBase.recordFeedback(feedback);
  }, [knowledgeBase]);

  return useMemo(() => ({
    search,
    getFAQs,
    getEntry,
    getPopular,
    getRecent,
    getByTags,
    recordFeedback,
    loading,
  }), [search, getFAQs, getEntry, getPopular, getRecent, getByTags, recordFeedback, loading]);
}

// ============================================================================
// MOBILE TROUBLESHOOTING HOOK
// ============================================================================

/**
 * Hook for mobile-specific troubleshooting
 */
export function useMobileTroubleshooting() {
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);

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

        // Add mobile-specific info if available
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection) {
            info.network = {
              type: connection.type || 'unknown',
              effectiveType: connection.effectiveType || 'unknown',
              downlink: connection.downlink || 0,
              rtt: connection.rtt || 0,
            };
          }
        }

        if ('getBattery' in navigator) {
          (navigator as any).getBattery().then((battery: any) => {
            info.battery = {
              level: battery.level,
              charging: battery.charging,
            };
            setDeviceInfo({ ...info });
          });
        }

        setDeviceInfo(info);
      }
    };

    checkMobile();
  }, []);

  const getMobileGuides = useCallback(async (
    sessionId: string
  ): Promise<MobileTroubleshootingGuide[]> => {
    if (!isMobile) {
      return [];
    }

    setLoading(true);

    try {
      // This would need to be implemented in the manager
      return [];
    } finally {
      setLoading(false);
    }
  }, [isMobile]);

  const optimizeForMobile = useCallback(async (
    guide: TroubleshootingGuide
  ): Promise<MobileTroubleshootingGuide> => {
    setLoading(true);

    try {
      // Convert to mobile guide
      const mobileGuide: MobileTroubleshootingGuide = {
        mobileSpecific: true,
        deviceTypes: ['ios', 'android', 'both'],
        appVersions: {
          min: '1.0.0',
        },
        touchOptimized: true,
        offlineAvailable: true,
        batteryConsiderations: true,
        networkOptimizations: true,
        storageRequirements: 50,
        ...guide,
      };

      return mobileGuide;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMobileCapabilities = useCallback(async (): Promise<Record<string, boolean>> => {
    const capabilities = {
      touch: 'ontouchstart' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      vibration: 'vibrate' in navigator,
      offline: 'serviceWorker' in navigator,
      webgl: checkWebGL(),
      webAudio: checkWebAudio(),
      localStorage: checkLocalStorage(),
      sessionStorage: checkSessionStorage(),
      indexedDB: 'indexedDB' in window,
    };

    return capabilities;
  }, []);

  return useMemo(() => ({
    isMobile,
    deviceInfo,
    loading,
    getMobileGuides,
    optimizeForMobile,
    checkMobileCapabilities,
  }), [isMobile, deviceInfo, loading, getMobileGuides, optimizeForMobile, checkMobileCapabilities]);
}

// ============================================================================
// TROUBLESHOOTING ANALYTICS HOOK
// ============================================================================

/**
 * Hook for troubleshooting analytics
 */
export function useTroubleshootingAnalytics() {
  const [analytics, setAnalytics] = useState<TroubleshootingAnalytics[]>([]);
  const [loading, setLoading] = useState(false);

  const getSuccessMetrics = useCallback(async (
    timeRange?: { start: Date; end: Date }
  ): Promise<SuccessMetrics> => {
    setLoading(true);

    try {
      // This would need to be implemented in the manager
      return {
        totalSessions: 0,
        completedSessions: 0,
        successfulResolutions: 0,
        averageSessionDuration: 0,
        averageStepsPerSession: 0,
        mostCommonSymptoms: [],
        mostEffectiveGuides: [],
        userSatisfaction: {
          averageRating: 0,
          wouldRecommend: 0,
          helpfulCount: 0,
          totalFeedback: 0,
        },
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getGuideAnalytics = useCallback(async (): Promise<Array<{
    guideId: string;
    usage: number;
    successRate: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>> => {
    setLoading(true);

    try {
      // This would need to be implemented in the manager
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const trackEvent = useCallback((
    sessionId: string,
    action: AnalyticsAction,
    data?: any
  ): void => {
    const event: TroubleshootingAnalytics = {
      sessionId,
      action,
      duration: 0,
      success: true,
      context: data || {},
      timestamp: new Date(),
    };

    setAnalytics(prev => [...prev, event]);
  }, []);

  const getPopularGuides = useCallback(async (
    limit: number = 10
  ): Promise<TroubleshootingGuide[]> => {
    setLoading(true);

    try {
      // This would need to be implemented
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getCommonSymptoms = useCallback(async (
    limit: number = 10
  ): Promise<SymptomAnalysis[]> => {
    setLoading(true);

    try {
      // This would need to be implemented
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    analytics,
    loading,
    getSuccessMetrics,
    getGuideAnalytics,
    trackEvent,
    getPopularGuides,
    getCommonSymptoms,
  }), [analytics, loading, getSuccessMetrics, getGuideAnalytics, trackEvent, getPopularGuides, getCommonSymptoms]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getOperatingSystem(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function getOperatingSystemVersion(): string {
  const ua = navigator.userAgent;
  const match = ua.match(/(Windows NT|Mac OS X|Android|iOS) ([\d._]+)/);
  return match ? match[2] : 'Unknown';
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function checkWebAudio(): boolean {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
}

function checkLocalStorage(): boolean {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}

function checkSessionStorage(): boolean {
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}

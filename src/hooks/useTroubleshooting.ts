/**
 * React Hooks for Troubleshooting System
 *
 * Custom React hooks that provide easy integration with the troubleshooting
 * guidance system for React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  TroubleshootingManager,
  TroubleshootingConfig,
  WizardSession,
  SymptomAnalysis,
  TroubleshootingGuide,
  KnowledgeBaseEntry,
  FAQ,
  SymptomCategory,
  UserFeedback,
  SuccessMetrics,
  MobileTroubleshootingGuide,
  createTroubleshootingManager,
} from '@/lib/errors/troubleshooting';

// ============================================================================
// TROUBLESHOOTING MANAGER HOOK
// ============================================================================

interface UseTroubleshootingManagerReturn {
  manager: TroubleshootingManager;
  createSession: (errorId?: string, errorCode?: string) => Promise<WizardSession>;
  getSession: (sessionId: string) => WizardSession | undefined;
  getKnowledgeBase: () => any; // Would be KnowledgeBase type
}

/**
 * Hook for accessing the troubleshooting manager
 */
export function useTroubleshootingManager(
  config?: Partial<TroubleshootingConfig>
): UseTroubleshootingManagerReturn {
  const managerRef = useRef<TroubleshootingManager>();

  // Initialize manager if not exists
  if (!managerRef.current) {
    managerRef.current = createTroubleshootingManager(config);
  }

  const manager = managerRef.current;

  const createSession = useCallback(async (errorId?: string, errorCode?: string) => {
    return await manager.createSession(errorId, errorCode);
  }, [manager]);

  const getSession = useCallback((sessionId: string) => {
    return manager.getSession(sessionId);
  }, [manager]);

  const getKnowledgeBase = useCallback(() => {
    // This would need to be implemented in the manager
    return {} as any;
  }, [manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, []);

  return {
    manager,
    createSession,
    getSession,
    getKnowledgeBase,
  };
}

// ============================================================================
// TROUBLESHOOTING SESSION HOOK
// ============================================================================

interface UseTroubleshootingSessionReturn {
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
  progress: {
    percentage: number;
    completedSteps: number;
    totalSteps: number;
    currentStepTitle: string;
  } | null;
}

/**
 * Hook for troubleshooting session management
 */
export function useTroubleshootingSession(
  sessionId?: string,
  errorId?: string,
  errorCode?: string
): UseTroubleshootingSessionReturn {
  const { manager } = useTroubleshootingManager();
  const [session, setSession] = useState<WizardSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query for session data
  const { data: sessionData, refetch } = useQuery({
    queryKey: ['troubleshooting-session', sessionId],
    queryFn: async () => {
      if (sessionId) {
        return manager.getSession(sessionId);
      }
      return null;
    },
    enabled: !!sessionId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update session state when query data changes
  useEffect(() => {
    if (sessionData) {
      setSession(sessionData);
    }
  }, [sessionData]);

  // Start new session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (params: { errorId?: string; errorCode?: string }) => {
      setLoading(true);
      setError(null);
      return await manager.createSession(params.errorId, params.errorCode);
    },
    onSuccess: (newSession) => {
      setSession(newSession);
      setLoading(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setLoading(false);
    },
  });

  // Analyze symptoms mutation
  const analyzeSymptomsMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      if (!session) throw new Error('No active session');
      return await manager.analyzeSymptoms(session.id, answers);
    },
    onSuccess: () => {
      // Refetch session to get updated data
      refetch();
    },
  });

  // Get guides mutation
  const getGuidesMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No active session');
      return await manager.getRecommendedGuides(session.id);
    },
  });

  // Execute step mutation
  const executeStepMutation = useMutation({
    mutationFn: async (params: { stepId: string; parameters?: Record<string, any> }) => {
      if (!session) throw new Error('No active session');
      return await manager.executeStep(session.id, params.stepId, params.parameters);
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      if (!session) throw new Error('No active session');
      return await manager.skipStep(session.id, stepId);
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Verify resolution mutation
  const verifyResolutionMutation = useMutation({
    mutationFn: async (verificationData?: Record<string, any>) => {
      if (!session) throw new Error('No active session');
      return await manager.verifyResolution(session.id, verificationData);
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async (feedback?: any) => {
      if (!session) throw new Error('No active session');
      return await manager.completeSession(session.id, feedback);
    },
    onSuccess: () => {
      setSession(null);
    },
  });

  // Abandon session mutation
  const abandonSessionMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (session) {
        return await manager.abandonSession(session.id, reason);
      }
    },
    onSuccess: () => {
      setSession(null);
    },
  });

  // Calculate progress
  const progress = session ? {
    percentage: session.progress.percentage,
    completedSteps: session.progress.completedSteps,
    totalSteps: session.progress.totalSteps,
    currentStepTitle: session.steps[session.currentStep]?.title || 'Unknown',
  } : null;

  // Handler functions
  const startSession = useCallback(async (errorId?: string, errorCode?: string) => {
    const result = await startSessionMutation.mutateAsync({ errorId, errorCode });
    return result.id;
  }, [startSessionMutation]);

  const analyzeSymptoms = useCallback(async (answers: Record<string, any>) => {
    return await analyzeSymptomsMutation.mutateAsync(answers);
  }, [analyzeSymptomsMutation]);

  const getGuides = useCallback(async () => {
    return await getGuidesMutation.mutateAsync();
  }, [getGuidesMutation]);

  const executeStep = useCallback(async (stepId: string, parameters?: Record<string, any>) => {
    return await executeStepMutation.mutateAsync({ stepId, parameters });
  }, [executeStepMutation]);

  const skipStep = useCallback(async (stepId: string) => {
    return await skipStepMutation.mutateAsync(stepId);
  }, [skipStepMutation]);

  const verifyResolution = useCallback(async (verificationData?: Record<string, any>) => {
    return await verifyResolutionMutation.mutateAsync(verificationData);
  }, [verifyResolutionMutation]);

  const completeSession = useCallback(async (feedback?: any) => {
    return await completeSessionMutation.mutateAsync(feedback);
  }, [completeSessionMutation]);

  const abandonSession = useCallback(async (reason?: string) => {
    return await abandonSessionMutation.mutateAsync(reason);
  }, [abandonSessionMutation]);

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
    progress,
  };
}

// ============================================================================
// SYMPTOM CHECKER HOOK
// ============================================================================

interface UseSymptomCheckerReturn {
  questions: any[]; // Would be SymptomQuestion[]
  analyzeAnswers: (answers: Record<string, any>) => Promise<SymptomAnalysis[]>;
  getQuestionsForCategory: (category: SymptomCategory) => any[]; // Would be SymptomQuestion[]
  searchSymptoms: (query: string, category?: SymptomCategory) => Promise<any[]>; // Would be Symptom[]
  loading: boolean;
  error: string | null;
}

/**
 * Hook for symptom checking functionality
 */
export function useSymptomChecker(category?: SymptomCategory): UseSymptomCheckerReturn {
  const { manager } = useTroubleshootingManager();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get questions for category
  const { data: questions = [] } = useQuery({
    queryKey: ['symptom-questions', category],
    queryFn: async () => {
      // This would need to be implemented in the manager
      return [];
    },
  });

  // Analyze answers mutation
  const analyzeAnswersMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      setLoading(true);
      setError(null);
      // This would need to be implemented in the manager
      return [] as SymptomAnalysis[];
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setLoading(false);
    },
  });

  // Search symptoms mutation
  const searchSymptomsMutation = useMutation({
    mutationFn: async (params: { query: string; category?: SymptomCategory }) => {
      // This would need to be implemented in the manager
      return [] as any[];
    },
  });

  const analyzeAnswers = useCallback(async (answers: Record<string, any>) => {
    return await analyzeAnswersMutation.mutateAsync(answers);
  }, [analyzeAnswersMutation]);

  const getQuestionsForCategory = useCallback((cat: SymptomCategory) => {
    // This would need to be implemented
    return [];
  }, []);

  const searchSymptoms = useCallback(async (query: string, cat?: SymptomCategory) => {
    return await searchSymptomsMutation.mutateAsync({ query, category: cat });
  }, [searchSymptomsMutation]);

  return {
    questions,
    analyzeAnswers,
    getQuestionsForCategory,
    searchSymptoms,
    loading,
    error,
  };
}

// ============================================================================
// KNOWLEDGE BASE HOOK
// ============================================================================

interface UseKnowledgeBaseReturn {
  search: (query: string, category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getFAQs: (category?: SymptomCategory, limit?: number) => Promise<FAQ[]>;
  getEntry: (id: string) => Promise<KnowledgeBaseEntry | undefined>;
  getPopular: (category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getRecent: (category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  getByTags: (tags: string[], category?: SymptomCategory, limit?: number) => Promise<KnowledgeBaseEntry[]>;
  recordFeedback: (entryId: string, feedback: UserFeedback) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for knowledge base access
 */
export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const { manager } = useTroubleshootingManager();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search knowledge base
  const searchMutation = useMutation({
    mutationFn: async (params: { query: string; category?: SymptomCategory; limit?: number }) => {
      setLoading(true);
      setError(null);
      // This would need to be implemented in the manager
      return [] as KnowledgeBaseEntry[];
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
    },
  });

  // Get FAQs mutation
  const getFAQsMutation = useMutation({
    mutationFn: async (params: { category?: SymptomCategory; limit?: number }) => {
      // This would need to be implemented in the manager
      return [] as FAQ[];
    },
  });

  // Get entry by ID
  const getEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      // This would need to be implemented in the manager
      return undefined as KnowledgeBaseEntry | undefined;
    },
  });

  // Get popular entries
  const getPopularMutation = useMutation({
    mutationFn: async (params: { category?: SymptomCategory; limit?: number }) => {
      // This would need to be implemented in the manager
      return [] as KnowledgeBaseEntry[];
    },
  });

  // Get recent entries
  const getRecentMutation = useMutation({
    mutationFn: async (params: { category?: SymptomCategory; limit?: number }) => {
      // This would need to be implemented in the manager
      return [] as KnowledgeBaseEntry[];
    },
  });

  // Get entries by tags
  const getByTagsMutation = useMutation({
    mutationFn: async (params: { tags: string[]; category?: SymptomCategory; limit?: number }) => {
      // This would need to be implemented in the manager
      return [] as KnowledgeBaseEntry[];
    },
  });

  // Record feedback mutation
  const recordFeedbackMutation = useMutation({
    mutationFn: async (params: { entryId: string; feedback: UserFeedback }) => {
      // This would need to be implemented in the manager
    },
  });

  const search = useCallback(async (query: string, category?: SymptomCategory, limit?: number) => {
    return await searchMutation.mutateAsync({ query, category, limit });
  }, [searchMutation]);

  const getFAQs = useCallback(async (category?: SymptomCategory, limit?: number) => {
    return await getFAQsMutation.mutateAsync({ category, limit });
  }, [getFAQsMutation]);

  const getEntry = useCallback(async (id: string) => {
    return await getEntryMutation.mutateAsync(id);
  }, [getEntryMutation]);

  const getPopular = useCallback(async (category?: SymptomCategory, limit?: number) => {
    return await getPopularMutation.mutateAsync({ category, limit });
  }, [getPopularMutation]);

  const getRecent = useCallback(async (category?: SymptomCategory, limit?: number) => {
    return await getRecentMutation.mutateAsync({ category, limit });
  }, [getRecentMutation]);

  const getByTags = useCallback(async (tags: string[], category?: SymptomCategory, limit?: number) => {
    return await getByTagsMutation.mutateAsync({ tags, category, limit });
  }, [getByTagsMutation]);

  const recordFeedback = useCallback(async (entryId: string, feedback: UserFeedback) => {
    return await recordFeedbackMutation.mutateAsync({ entryId, feedback });
  }, [recordFeedbackMutation]);

  return {
    search,
    getFAQs,
    getEntry,
    getPopular,
    getRecent,
    getByTags,
    recordFeedback,
    loading,
    error,
  };
}

// ============================================================================
// MOBILE TROUBLESHOOTING HOOK
// ============================================================================

interface UseMobileTroubleshootingReturn {
  isMobile: boolean;
  deviceInfo: any; // Would be DeviceInfo
  getMobileGuides: (sessionId: string) => Promise<MobileTroubleshootingGuide[]>;
  optimizeForMobile: (guide: TroubleshootingGuide) => Promise<MobileTroubleshootingGuide>;
  checkMobileCapabilities: () => Promise<Record<string, boolean>>;
}

/**
 * Hook for mobile-specific troubleshooting
 */
export function useMobileTroubleshooting(): UseMobileTroubleshootingReturn {
  const { manager } = useTroubleshootingManager();
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(mobile);

      if (mobile) {
        setDeviceInfo({
          type: mobile ? 'mobile' : 'desktop',
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          pixelRatio: window.devicePixelRatio,
          touchSupport: 'ontouchstart' in window,
        });
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get mobile guides mutation
  const getMobileGuidesMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!manager) throw new Error('Manager not available');
      // This would need to be implemented in the manager
      return [] as MobileTroubleshootingGuide[];
    },
  });

  // Optimize guide for mobile mutation
  const optimizeForMobileMutation = useMutation({
    mutationFn: async (guide: TroubleshootingGuide) => {
      // This would need to be implemented in the manager
      return {} as MobileTroubleshootingGuide;
    },
  });

  // Check mobile capabilities mutation
  const checkMobileCapabilitiesMutation = useMutation({
    mutationFn: async () => {
      const capabilities: Record<string, boolean> = {
        touchSupport: 'ontouchstart' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        vibration: 'vibrate' in navigator,
        fullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
        localStorage: this.checkLocalStorage(),
        sessionStorage: this.checkSessionStorage(),
        indexedDB: 'indexedDB' in window,
        webGL: this.checkWebGL(),
        webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      };

      return capabilities;
    },
  });

  const getMobileGuides = useCallback(async (sessionId: string) => {
    return await getMobileGuidesMutation.mutateAsync(sessionId);
  }, [getMobileGuidesMutation]);

  const optimizeForMobile = useCallback(async (guide: TroubleshootingGuide) => {
    return await optimizeForMobileMutation.mutateAsync(guide);
  }, [optimizeForMobileMutation]);

  const checkMobileCapabilities = useCallback(async () => {
    return await checkMobileCapabilitiesMutation.mutateAsync();
  }, [checkMobileCapabilitiesMutation]);

  // Helper methods
  const checkLocalStorage = () => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  };

  const checkSessionStorage = () => {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  };

  const checkWebGL = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  };

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

interface UseTroubleshootingAnalyticsReturn {
  getSuccessMetrics: (timeRange?: { start: Date; end: Date }) => Promise<SuccessMetrics>;
  getGuideAnalytics: () => Promise<Array<{
    guideId: string;
    usage: number;
    successRate: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>>;
  trackEvent: (sessionId: string, action: string, data?: any) => void;
  getPopularGuides: (limit?: number) => Promise<TroubleshootingGuide[]>;
  getCommonSymptoms: (limit?: number) => Promise<SymptomAnalysis[]>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for troubleshooting analytics
 */
export function useTroubleshootingAnalytics(): UseTroubleshootingAnalyticsReturn {
  const { manager } = useTroubleshootingManager();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get success metrics mutation
  const getSuccessMetricsMutation = useMutation({
    mutationFn: async (timeRange?: { start: Date; end: Date }) => {
      setLoading(true);
      setError(null);
      if (!manager) throw new Error('Manager not available');
      // This would need to be implemented in the manager
      return {} as SuccessMetrics;
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Analytics failed');
      setLoading(false);
    },
  });

  // Get guide analytics mutation
  const getGuideAnalyticsMutation = useMutation({
    mutationFn: async () => {
      // This would need to be implemented in the manager
      return [] as Array<{
        guideId: string;
        usage: number;
        successRate: number;
        performance: 'excellent' | 'good' | 'average' | 'poor';
      }>;
    },
  });

  // Track event
  const trackEvent = useCallback((sessionId: string, action: string, data?: any) => {
    if (!manager) return;
    // This would need to be implemented in the manager
    console.log('Tracking event:', { sessionId, action, data });
  }, [manager]);

  // Get popular guides mutation
  const getPopularGuidesMutation = useMutation({
    mutationFn: async (limit?: number) => {
      // This would need to be implemented in the manager
      return [] as TroubleshootingGuide[];
    },
  });

  // Get common symptoms mutation
  const getCommonSymptomsMutation = useMutation({
    mutationFn: async (limit?: number) => {
      // This would need to be implemented in the manager
      return [] as SymptomAnalysis[];
    },
  });

  const getSuccessMetrics = useCallback(async (timeRange?: { start: Date; end: Date }) => {
    return await getSuccessMetricsMutation.mutateAsync(timeRange);
  }, [getSuccessMetricsMutation]);

  const getGuideAnalytics = useCallback(async () => {
    return await getGuideAnalyticsMutation.mutateAsync();
  }, [getGuideAnalyticsMutation]);

  const getPopularGuides = useCallback(async (limit?: number) => {
    return await getPopularGuidesMutation.mutateAsync(limit);
  }, [getPopularGuidesMutation]);

  const getCommonSymptoms = useCallback(async (limit?: number) => {
    return await getCommonSymptomsMutation.mutateAsync(limit);
  }, [getCommonSymptomsMutation]);

  return {
    getSuccessMetrics,
    getGuideAnalytics,
    trackEvent,
    getPopularGuides,
    getCommonSymptoms,
    loading,
    error,
  };
}

// ============================================================================
// ERROR INTEGRATION HOOK
// ============================================================================

interface UseErrorIntegrationReturn {
  troubleshootError: (error: Error, context?: Record<string, any>) => Promise<{
    sessionId: string;
    guides: TroubleshootingGuide[];
  }>;
  addTroubleshootingButton: (errorElement: HTMLElement, error: Error) => void;
  autoStartForError: (error: Error, autoStart: boolean) => Promise<boolean>;
}

/**
 * Hook for integrating troubleshooting with existing error handling
 */
export function useErrorIntegration(): UseErrorIntegrationReturn {
  const { manager } = useTroubleshootingManager();

  const troubleshootError = useCallback(async (error: Error, context?: Record<string, any>) => {
    if (!manager) throw new Error('Manager not available');

    // Create session based on error
    const session = await manager.createSession(
      context?.errorId || error.name,
      context?.errorCode
    );

    // Get recommended guides based on error
    const guides = await manager.getRecommendedGuides(session.id);

    return {
      sessionId: session.id,
      guides,
    };
  }, [manager]);

  const addTroubleshootingButton = useCallback((errorElement: HTMLElement, error: Error) => {
    // Create troubleshooting button
    const button = document.createElement('button');
    button.textContent = 'Troubleshoot';
    button.className = 'troubleshoot-button';
    button.style.marginLeft = '10px';
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#007bff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.cursor = 'pointer';

    // Add click handler
    button.addEventListener('click', async () => {
      try {
        const { sessionId } = await troubleshootError(error);
        // This would open the troubleshooting modal
        console.log('Started troubleshooting session:', sessionId);
      } catch (err) {
        console.error('Failed to start troubleshooting:', err);
      }
    });

    // Add button to error element
    errorElement.appendChild(button);
  }, [troubleshootError]);

  const autoStartForError = useCallback(async (error: Error, autoStart: boolean) => {
    if (!autoStart) return false;

    try {
      await troubleshootError(error);
      return true;
    } catch {
      return false;
    }
  }, [troubleshootError]);

  return {
    troubleshootError,
    addTroubleshootingButton,
    autoStartForError,
  };
}

// ============================================================================
// QUICK START HOOK
// ============================================================================

/**
 * Quick start hook for easy troubleshooting setup
 */
export function useQuickTroubleshooting(errorId?: string, errorCode?: string) {
  const session = useTroubleshootingSession(undefined, errorId, errorCode);
  const knowledgeBase = useKnowledgeBase();
  const mobile = useMobileTroubleshooting();

  // Auto-start session on mount if error provided
  useEffect(() => {
    if (errorId && !session.session && !session.loading) {
      session.startSession(errorId, errorCode);
    }
  }, [errorId, errorCode, session]);

  return {
    session,
    knowledgeBase,
    mobile,
    startTroubleshooting: session.startSession,
    isReady: !session.loading && !session.error,
  };
}

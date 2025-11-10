/**
 * Guidance Generator
 *
 * Personalized help generator that creates tailored troubleshooting guides
 * based on symptom analysis, user context, and historical success patterns.
 */

import {
  TroubleshootingContext,
  SymptomAnalysis,
  TroubleshootingGuide,
  GuidanceGenerator as IGuidanceGenerator,
  TargetAudience,
  DifficultyLevel,
  SymptomCategory,
  SymptomSeverity,
  TroubleshootingStep,
  StepType,
  ActionType,
  VerificationStep,
  VerificationType,
  TroubleshootingConfig,
  MobileTroubleshootingGuide,
  MobileTroubleshootingContext,
} from './types';

// ============================================================================
// GUIDE TEMPLATES
// ============================================================================

/**
 * Network connectivity troubleshooting guide template
 */
const NETWORK_CONNECTIVITY_GUIDE: Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'> = {
  title: 'Network Connectivity Troubleshooting',
  description: 'Step-by-step guide to resolve network connection issues',
  category: SymptomCategory.NETWORK,
  severity: SymptomSeverity.HIGH,
  targetAudience: TargetAudience.BEGINNER,
  estimatedTime: 10,
  successRate: 0.75,
  difficulty: DifficultyLevel.EASY,
  prerequisites: ['Internet access for testing'],
  symptoms: ['network_connection_lost', 'slow_connection'],
  steps: [
    {
      id: 'check_basic_connection',
      title: 'Check Basic Internet Connection',
      description: 'Verify your device has a working internet connection',
      instructions: [
        'Try visiting other websites (google.com, youtube.com)',
        'If other sites work, the issue may be specific to our service',
        'If no sites work, continue with network troubleshooting',
      ],
      type: StepType.CHECK,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 2,
      requiredTools: ['Web browser'],
      risks: [],
      tips: ['Use a different device to confirm if the issue is device-specific'],
      images: [],
      videos: [],
      conditions: [],
      actions: [
        {
          id: 'test_connection',
          type: ActionType.NAVIGATION,
          label: 'Test Connection',
          description: 'Open a test website in a new tab',
          automation: true,
          script: 'https://www.google.com',
          confirmation: false,
        },
      ],
      nextStepMapping: {
        success: 'check_router_modem',
        failure: 'restart_equipment',
      },
    },
    {
      id: 'restart_equipment',
      title: 'Restart Network Equipment',
      description: 'Power cycle your router and modem to refresh the connection',
      instructions: [
        'Unplug both modem and router from power',
        'Wait 30 seconds',
        'Plug in the modem first and wait for all lights to stabilize',
        'Plug in the router and wait for it to fully start up',
        'Try connecting again',
      ],
      type: StepType.TROUBLESHOOTING,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 5,
      requiredTools: ['Access to power outlets'],
      risks: ['Temporary loss of internet connection'],
      tips: ['This resolves most connection issues', 'Take a photo of cable connections before unplugging'],
      images: [],
      videos: [],
      conditions: [],
      actions: [],
      nextStepMapping: {
        success: 'check_router_modem',
        failure: 'check_other_devices',
      },
    },
    {
      id: 'check_other_devices',
      title: 'Check Other Devices',
      description: 'Determine if the issue affects multiple devices',
      instructions: [
        'Try connecting with another device on the same network',
        'Test both WiFi and Ethernet connections if available',
        'If other devices work, the issue is device-specific',
        'If no devices work, the issue is network-wide',
      ],
      type: StepType.CHECK,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 3,
      requiredTools: ['Additional device'],
      risks: [],
      tips: ['Use a smartphone to test cellular data vs WiFi'],
      images: [],
      videos: [],
      conditions: [],
      actions: [],
      nextStepMapping: {
        'device_specific': 'device_specific_troubleshooting',
        'network_wide': 'check_isp_status',
      },
    },
  ],
  verification: [
    {
      id: 'verify_connection',
      title: 'Verify Network Connection',
      description: 'Confirm that your network connection is working properly',
      instructions: [
        'Visit our application homepage',
        'Try loading a page or feature',
        'Check if the original error persists',
      ],
      type: VerificationType.USER_CONFIRMATION,
      expectedOutcome: 'Application loads without network errors',
      successMessage: 'Network connection is working properly!',
      failureMessage: 'Network issues persist. Try advanced troubleshooting or contact support.',
      retryAllowed: true,
      maxRetries: 3,
    },
  ],
  alternatives: [
    {
      id: 'mobile_hotspot',
      title: 'Use Mobile Hotspot',
      description: 'Temporarily use your phone as a WiFi hotspot',
      whenToUse: 'When you need immediate internet access and home network is down',
      pros: ['Quick setup', 'Works anywhere with cellular signal'],
      cons: ['Uses mobile data', 'May be slower than home internet'],
      guide: 'mobile_hotspot_setup',
    },
    {
      id: 'public_wifi',
      title: 'Use Public WiFi',
      description: 'Connect to a public WiFi network temporarily',
      whenToUse: 'When you need internet access away from home',
      pros: ['Usually free', 'Available in many locations'],
      cons: ['Security concerns', 'May have usage limits'],
      guide: 'public_wifi_safety',
    },
  ],
  faqs: [],
  relatedGuides: ['wifi_troubleshooting', 'router_configuration'],
  tags: ['network', 'connection', 'internet', 'wifi', 'troubleshooting'],
  author: 'GuidanceGenerator',
};

/**
 * Audio playback troubleshooting guide template
 */
const AUDIO_PLAYBACK_GUIDE: Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'> = {
  title: 'Audio Playback Troubleshooting',
  description: 'Resolve issues with audio not playing during transcription playback',
  category: SymptomCategory.AUDIO_PLAYBACK,
  severity: SymptomSeverity.MEDIUM,
  targetAudience: TargetAudience.BEGINNER,
  estimatedTime: 8,
  successRate: 0.82,
  difficulty: DifficultyLevel.MODERATE,
  prerequisites: ['Audio file available'],
  symptoms: ['audio_no_sound', 'audio_stuttering'],
  steps: [
    {
      id: 'check_device_volume',
      title: 'Check Device Volume Settings',
      description: 'Verify your device volume is turned up and not muted',
      instructions: [
        'Check physical volume buttons on your device',
        'Look for mute indicators in the system tray or menu bar',
        'Test audio with other applications or websites',
        'Adjust volume to a comfortable level',
      ],
      type: StepType.CHECK,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 2,
      requiredTools: ['Device with volume controls'],
      risks: [],
      tips: ['Some keyboards have mute buttons that might have been accidentally pressed'],
      images: [],
      videos: [],
      conditions: [],
      actions: [],
      nextStepMapping: {
        success: 'check_browser_permissions',
        failure: 'check_audio_hardware',
      },
    },
    {
      id: 'check_browser_permissions',
      title: 'Check Browser Audio Permissions',
      description: 'Ensure your browser has permission to play audio',
      instructions: [
        'Look for audio permission icons in the address bar',
        'Click on the permission icon and allow audio playback',
        'Refresh the page after changing permissions',
        'Try playing audio again',
      ],
      type: StepType.CONFIGURATION,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 3,
      requiredTools: ['Web browser'],
      risks: [],
      tips: ['Some browsers require explicit permission for audio autoplay'],
      images: [],
      videos: [],
      conditions: [],
      actions: [
        {
          id: 'refresh_page',
          type: ActionType.REFRESH,
          label: 'Refresh Page',
          description: 'Refresh the page to apply permission changes',
          automation: true,
          confirmation: false,
        },
      ],
      nextStepMapping: {
        success: 'test_different_browser',
        failure: 'check_audio_format',
      },
    },
  ],
  verification: [
    {
      id: 'verify_audio_playback',
      title: 'Verify Audio Playback',
      description: 'Test if audio is now playing correctly',
      instructions: [
        'Play a transcription file',
        'Listen for clear audio without interruptions',
        'Check volume levels are appropriate',
        'Verify playback controls work correctly',
      ],
      type: VerificationType.MANUAL,
      expectedOutcome: 'Audio plays clearly with proper volume',
      successMessage: 'Audio playback is working correctly!',
      failureMessage: 'Audio issues persist. Continue with additional troubleshooting steps.',
      retryAllowed: true,
      maxRetries: 2,
    },
  ],
  alternatives: [
    {
      id: 'download_and_play',
      title: 'Download Audio File',
      description: 'Download the audio file and play it with a local media player',
      whenToUse: 'When browser playback fails but file is accessible',
      pros: ['More control over playback', 'Works with various audio formats'],
      cons: ['Requires local media player', 'Uses device storage'],
      guide: 'audio_download_guide',
    },
  ],
  faqs: [],
  relatedGuides: ['browser_compatibility', 'audio_format_conversion'],
  tags: ['audio', 'playback', 'sound', 'volume', 'browser'],
  author: 'GuidanceGenerator',
};

/**
 * File upload troubleshooting guide template
 */
const FILE_UPLOAD_GUIDE: Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'> = {
  title: 'File Upload Troubleshooting',
  description: 'Resolve issues with uploading audio files for transcription',
  category: SymptomCategory.FILE_UPLOAD,
  severity: SymptomSeverity.HIGH,
  targetAudience: TargetAudience.INTERMEDIATE,
  estimatedTime: 12,
  successRate: 0.78,
  difficulty: DifficultyLevel.MODERATE,
  prerequisites: ['Audio file ready for upload'],
  symptoms: ['file_upload_fails', 'file_size_exceeded'],
  steps: [
    {
      id: 'check_file_specifications',
      title: 'Check File Specifications',
      description: 'Verify your file meets the upload requirements',
      instructions: [
        'Check file size is under 100MB limit',
        'Verify file format is supported (MP3, WAV, M4A, FLAC)',
        'Ensure file is not corrupted or password protected',
        'Check that filename doesn\'t contain special characters',
      ],
      type: StepType.CHECK,
      difficulty: DifficultyLevel.EASY,
      estimatedTime: 3,
      requiredTools: ['File explorer', 'Audio player'],
      risks: [],
      tips: ['Use file properties to check size and format details'],
      images: [],
      videos: [],
      conditions: [],
      actions: [],
      nextStepMapping: {
        success: 'compress_file',
        failure: 'convert_file_format',
      },
    },
  ],
  verification: [
    {
      id: 'verify_upload',
      title: 'Verify File Upload',
      description: 'Confirm that your file uploaded successfully',
      instructions: [
        'Check if the file appears in your uploads list',
        'Verify the file size matches your original file',
        'Try starting transcription with the uploaded file',
        'Confirm no error messages appear during upload',
      ],
      type: VerificationType.SYSTEM_CHECK,
      expectedOutcome: 'File appears in uploads and can be processed',
      successMessage: 'File uploaded successfully!',
      failureMessage: 'Upload failed. Try the steps again or contact support.',
      retryAllowed: true,
      maxRetries: 3,
    },
  ],
  alternatives: [
    {
      id: 'chunk_upload',
      title: 'Use Chunked Upload',
      description: 'Split large files into smaller chunks for upload',
      whenToUse: 'When file size exceeds upload limits',
      pros: ['Handles very large files', 'More reliable on slow connections'],
      cons: ['Takes longer to process', 'Requires manual file splitting'],
      guide: 'chunked_upload_guide',
    },
  ],
  faqs: [],
  relatedGuides: ['audio_compression', 'file_conversion_tools'],
  tags: ['upload', 'file', 'size', 'format', 'transcription'],
  author: 'GuidanceGenerator',
};

/**
 * Mobile-specific troubleshooting guide template
 */
const MOBILE_OPTIMIZATION_GUIDE: Omit<MobileTroubleshootingGuide, 'id' | 'lastUpdated' | 'version'> = {
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
  title: 'Mobile App Optimization Guide',
  description: 'Optimize your mobile device for the best app performance',
  category: SymptomCategory.MOBILE_SPECIFIC,
  severity: SymptomSeverity.MEDIUM,
  targetAudience: TargetAudience.BEGINNER,
  estimatedTime: 15,
  successRate: 0.85,
  difficulty: DifficultyLevel.MODERATE,
  prerequisites: ['Mobile device with app installed'],
  symptoms: ['mobile_battery_drain', 'mobile_performance_slow'],
  steps: [
    {
      id: 'optimize_battery_settings',
      title: 'Optimize Battery Settings',
      description: 'Configure battery settings for optimal app performance',
      instructions: [
        'Go to device Settings > Battery',
        'Find our app in the battery usage list',
        'Disable battery optimization for our app',
        'Set background app refresh to allowed',
      ],
      type: StepType.CONFIGURATION,
      difficulty: DifficultyLevel.MODERATE,
      estimatedTime: 5,
      requiredTools: ['Device settings access'],
      risks: ['May affect battery life'],
      tips: ['This allows the app to run smoothly in the background'],
      images: [],
      videos: [],
      conditions: [],
      actions: [],
      nextStepMapping: {},
    },
  ],
  verification: [
    {
      id: 'verify_mobile_performance',
      title: 'Verify Mobile Performance',
      description: 'Test if mobile performance has improved',
      instructions: [
        'Use the app for 5-10 minutes',
        'Check if battery drain is reduced',
        'Test audio playback quality',
        'Verify transcription processing speed',
      ],
      type: VerificationType.USER_CONFIRMATION,
      expectedOutcome: 'Improved app performance and battery life',
      successMessage: 'Mobile optimization completed successfully!',
      failureMessage: 'Performance issues persist. Try additional optimization steps.',
      retryAllowed: true,
      maxRetries: 2,
    },
  ],
  alternatives: [],
  faqs: [],
  relatedGuides: ['ios_optimization', 'android_optimization'],
  tags: ['mobile', 'battery', 'performance', 'optimization'],
  author: 'GuidanceGenerator',
};

// ============================================================================
// MAIN GUIDANCE GENERATOR CLASS
// ============================================================================

/**
 * Personalized guidance generator
 */
export class GuidanceGenerator implements IGuidanceGenerator {
  private config: TroubleshootingConfig;
  private guideTemplates = new Map<string, Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'>>();
  private successMetrics = new Map<string, { usage: number; success: number }>();

  constructor(config: TroubleshootingConfig) {
    this.config = config;
    this.loadGuideTemplates();
  }

  /**
   * Generate guides based on symptom analysis
   */
  public async generateGuides(
    analysis: SymptomAnalysis[],
    context: TroubleshootingContext
  ): Promise<TroubleshootingGuide[]> {
    const guides: TroubleshootingGuide[] = [];

    // Sort analysis by confidence
    const sortedAnalysis = analysis.sort((a, b) => b.confidence - a.confidence);

    // Generate guide for each high-confidence symptom
    for (const symptomAnalysis of sortedAnalysis.slice(0, 3)) { // Top 3 symptoms
      const guide = await this.generateGuideForSymptom(symptomAnalysis, context);
      if (guide) {
        guides.push(guide);
      }
    }

    // Add mobile-specific guides if on mobile
    if (context.isMobile) {
      const mobileGuides = await this.generateMobileGuides(sortedAnalysis, context);
      guides.push(...mobileGuides);
    }

    // Sort guides by relevance and success rate
    guides.sort((a, b) => {
      const aScore = this.calculateGuideScore(a, analysis, context);
      const bScore = this.calculateGuideScore(b, analysis, context);
      return bScore - aScore;
    });

    return guides.slice(0, 5); // Return top 5 guides
  }

  /**
   * Generate mobile-specific guides
   */
  public async generateMobileGuides(
    analysis: SymptomAnalysis[],
    context: MobileTroubleshootingContext
  ): Promise<MobileTroubleshootingGuide[]> {
    const guides: MobileTroubleshootingGuide[] = [];

    // Check for mobile-specific symptoms
    const mobileSymptoms = analysis.filter(a =>
      a.symptomId.includes('mobile') ||
      a.symptomId.includes('battery') ||
      a.symptomId.includes('performance')
    );

    if (mobileSymptoms.length > 0) {
      const mobileGuide = this.createMobileGuide(MOBILE_OPTIMIZATION_GUIDE, context);
      guides.push(mobileGuide);
    }

    // Add device-specific guides
    if (context.deviceInfo?.os?.toLowerCase().includes('ios')) {
      const iosGuide = await this.generateIOSSpecificGuide(analysis, context);
      if (iosGuide) guides.push(iosGuide);
    } else if (context.deviceInfo?.os?.toLowerCase().includes('android')) {
      const androidGuide = await this.generateAndroidSpecificGuide(analysis, context);
      if (androidGuide) guides.push(androidGuide);
    }

    return guides;
  }

  /**
   * Create personalized guide
   */
  public async createPersonalizedGuide(
    symptomIds: string[],
    userContext: Partial<TroubleshootingContext>,
    preferredDifficulty?: DifficultyLevel
  ): Promise<TroubleshootingGuide> {
    // Determine target audience based on context
    const targetAudience = this.determineTargetAudience(userContext);
    const difficulty = preferredDifficulty || DifficultyLevel.MODERATE;

    // Create custom guide based on symptoms
    const customSteps = await this.createCustomSteps(symptomIds, userContext, difficulty);

    return {
      id: `custom_${Date.now()}`,
      title: `Personalized Troubleshooting Guide`,
      description: 'Custom guide created based on your specific situation',
      category: SymptomCategory.GENERAL,
      severity: SymptomSeverity.MEDIUM,
      targetAudience,
      estimatedTime: customSteps.reduce((total, step) => total + step.estimatedTime, 0),
      successRate: 0.7, // Estimate for custom guides
      difficulty,
      prerequisites: this.extractPrerequisites(symptomIds),
      symptoms: symptomIds,
      steps: customSteps,
      verification: this.createVerificationSteps(symptomIds),
      alternatives: this.createAlternatives(symptomIds),
      faqs: [],
      relatedGuides: this.findRelatedGuides(symptomIds),
      tags: ['custom', 'personalized', ...symptomIds],
      author: 'GuidanceGenerator',
      lastUpdated: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Get guide recommendations based on error context
   */
  public async getGuideRecommendations(
    errorCode?: string,
    errorMessage?: string,
    context?: Partial<TroubleshootingContext>
  ): Promise<TroubleshootingGuide[]> {
    const guides: TroubleshootingGuide[] = [];

    // Map error codes to specific guides
    if (errorCode) {
      const mappedGuides = this.mapErrorCodeToGuides(errorCode);
      guides.push(...mappedGuides);
    }

    // Extract keywords from error message and find relevant guides
    if (errorMessage) {
      const keywordGuides = this.findGuidesByKeywords(errorMessage);
      guides.push(...keywordGuides);
    }

    // Add context-based recommendations
    if (context) {
      const contextGuides = this.findGuidesByContext(context);
      guides.push(...contextGuides);
    }

    // Remove duplicates and sort by relevance
    const uniqueGuides = guides.filter((guide, index, self) =>
      index === self.findIndex(g => g.id === guide.id)
    );

    return uniqueGuides.slice(0, 3);
  }

  /**
   * Update guide success metrics
   */
  public updateGuideMetrics(guideId: string, success: boolean): void {
    const current = this.successMetrics.get(guideId) || { usage: 0, success: 0 };
    current.usage++;
    if (success) {
      current.success++;
    }
    this.successMetrics.set(guideId, current);
  }

  /**
   * Get guide performance analytics
   */
  public getGuideAnalytics(): Array<{
    guideId: string;
    usage: number;
    successRate: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }> {
    const analytics = [];

    for (const [guideId, metrics] of this.successMetrics.entries()) {
      const successRate = metrics.usage > 0 ? metrics.success / metrics.usage : 0;
      let performance: 'excellent' | 'good' | 'average' | 'poor';

      if (successRate >= 0.9) performance = 'excellent';
      else if (successRate >= 0.75) performance = 'good';
      else if (successRate >= 0.5) performance = 'average';
      else performance = 'poor';

      analytics.push({
        guideId,
        usage: metrics.usage,
        successRate,
        performance,
      });
    }

    return analytics.sort((a, b) => b.usage - a.usage);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: TroubleshootingConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy guidance generator
   */
  public destroy(): void {
    this.guideTemplates.clear();
    this.successMetrics.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load guide templates
   */
  private loadGuideTemplates(): void {
    this.guideTemplates.set('network_connectivity', NETWORK_CONNECTIVITY_GUIDE);
    this.guideTemplates.set('audio_playback', AUDIO_PLAYBACK_GUIDE);
    this.guideTemplates.set('file_upload', FILE_UPLOAD_GUIDE);
    this.guideTemplates.set('mobile_optimization', MOBILE_OPTIMIZATION_GUIDE);
  }

  /**
   * Generate guide for a specific symptom
   */
  private async generateGuideForSymptom(
    analysis: SymptomAnalysis,
    context: TroubleshootingContext
  ): Promise<TroubleshootingGuide | null> {
    // Map symptom to guide template
    const templateKey = this.mapSymptomToTemplate(analysis.symptomId);
    const template = this.guideTemplates.get(templateKey);

    if (!template) {
      return null;
    }

    // Customize guide based on context
    return this.customizeGuideTemplate(template, analysis, context);
  }

  /**
   * Map symptom to guide template
   */
  private mapSymptomToTemplate(symptomId: string): string {
    const mapping: Record<string, string> = {
      'network_connection_lost': 'network_connectivity',
      'slow_connection': 'network_connectivity',
      'audio_no_sound': 'audio_playback',
      'audio_stuttering': 'audio_playback',
      'file_upload_fails': 'file_upload',
      'file_size_exceeded': 'file_upload',
      'mobile_battery_drain': 'mobile_optimization',
      'mobile_performance_slow': 'mobile_optimization',
    };

    return mapping[symptomId] || 'general_troubleshooting';
  }

  /**
   * Customize guide template based on analysis and context
   */
  private customizeGuideTemplate(
    template: Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'>,
    analysis: SymptomAnalysis,
    context: TroubleshootingContext
  ): TroubleshootingGuide {
    // Adjust difficulty based on user context
    let difficulty = template.difficulty;
    let targetAudience = template.targetAudience;

    if (context.isMobile) {
      difficulty = this.adjustDifficultyForMobile(difficulty);
    }

    // Customize estimated time based on device and network
    let estimatedTime = template.estimatedTime;
    if (context.networkType === 'slow-2g' || context.networkType === '2g') {
      estimatedTime *= 1.5; // 50% more time on slow connections
    }

    // Filter steps based on context
    const steps = template.steps.map(step => this.customizeStep(step, context));

    return {
      ...template,
      id: `guide_${analysis.symptomId}_${Date.now()}`,
      difficulty,
      targetAudience,
      estimatedTime,
      steps,
      lastUpdated: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Adjust difficulty for mobile context
   */
  private adjustDifficultyForMobile(difficulty: DifficultyLevel): DifficultyLevel {
    switch (difficulty) {
      case DifficultyLevel.EXPERT:
        return DifficultyLevel.CHALLENGING;
      case DifficultyLevel.CHALLENGING:
        return DifficultyLevel.MODERATE;
      default:
        return DifficultyLevel.EASY;
    }
  }

  /**
   * Customize step based on context
   */
  private customizeStep(
    step: TroubleshootingStep,
    context: TroubleshootingContext
  ): TroubleshootingStep {
    // Add mobile-specific adjustments
    if (context.isMobile) {
      step.tips.push('This step is optimized for mobile devices');
      step.estimatedTime = Math.max(step.estimatedTime * 1.2, 2); // More time on mobile
    }

    // Add network-specific tips
    if (context.networkType === 'slow-2g' || context.networkType === '2g') {
      step.tips.push('This may take longer on slow connections');
    }

    return step;
  }

  /**
   * Create mobile guide from template
   */
  private createMobileGuide(
    template: Omit<MobileTroubleshootingGuide, 'id' | 'lastUpdated' | 'version'>,
    context: MobileTroubleshootingContext
  ): MobileTroubleshootingGuide {
    return {
      ...template,
      id: `mobile_guide_${Date.now()}`,
      lastUpdated: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Generate iOS-specific guide
   */
  private async generateIOSSpecificGuide(
    analysis: SymptomAnalysis[],
    context: MobileTroubleshootingContext
  ): Promise<MobileTroubleshootingGuide | null> {
    // Implementation for iOS-specific guidance
    return null;
  }

  /**
   * Generate Android-specific guide
   */
  private async generateAndroidSpecificGuide(
    analysis: SymptomAnalysis[],
    context: MobileTroubleshootingContext
  ): Promise<MobileTroubleshootingGuide | null> {
    // Implementation for Android-specific guidance
    return null;
  }

  /**
   * Calculate guide score for ranking
   */
  private calculateGuideScore(
    guide: TroubleshootingGuide,
    analysis: SymptomAnalysis[],
    context: TroubleshootingContext
  ): number {
    let score = guide.successRate * 0.4; // 40% weight for success rate

    // Bonus for matching symptoms
    const matchingSymptoms = analysis.filter(a => guide.symptoms.includes(a.symptomId));
    score += (matchingSymptoms.length / analysis.length) * 0.3; // 30% weight for symptom matching

    // Bonus for appropriate difficulty
    const difficultyScore = this.getDifficultyScore(guide.difficulty, context);
    score += difficultyScore * 0.2; // 20% weight for difficulty

    // Bonus for recent success
    const metrics = this.successMetrics.get(guide.id);
    if (metrics && metrics.usage > 10) {
      score += 0.1; // 10% bonus for proven guides
    }

    return score;
  }

  /**
   * Get difficulty score based on context
   */
  private getDifficultyScore(difficulty: DifficultyLevel, context: TroubleshootingContext): number {
    // Adjust score based on user context
    if (context.isMobile) {
      // Prefer easier guides on mobile
      switch (difficulty) {
        case DifficultyLevel.EASY: return 1.0;
        case DifficultyLevel.MODERATE: return 0.8;
        case DifficultyLevel.CHALLENGING: return 0.5;
        case DifficultyLevel.EXPERT: return 0.2;
      }
    }

    // Default scoring
    switch (difficulty) {
      case DifficultyLevel.EASY: return 0.7;
      case DifficultyLevel.MODERATE: return 1.0;
      case DifficultyLevel.CHALLENGING: return 0.8;
      case DifficultyLevel.EXPERT: return 0.5;
    }
  }

  /**
   * Determine target audience based on context
   */
  private determineTargetAudience(context: Partial<TroubleshootingContext>): TargetAudience {
    // Simple heuristic - could be made more sophisticated
    if (context.errorId?.includes('developer') || context.errorId?.includes('debug')) {
      return TargetAudience.DEVELOPER;
    }

    return TargetAudience.INTERMEDIATE;
  }

  /**
   * Create custom steps for personalized guides
   */
  private async createCustomSteps(
    symptomIds: string[],
    context: Partial<TroubleshootingContext>,
    difficulty: DifficultyLevel
  ): Promise<TroubleshootingStep[]> {
    // Implementation for creating custom steps
    return [];
  }

  /**
   * Extract prerequisites from symptoms
   */
  private extractPrerequisites(symptomIds: string[]): string[] {
    const prerequisites: string[] = [];

    if (symptomIds.some(id => id.includes('network'))) {
      prerequisites.push('Internet connection');
    }

    if (symptomIds.some(id => id.includes('audio'))) {
      prerequisites.push('Audio file or device');
    }

    if (symptomIds.some(id => id.includes('file'))) {
      prerequisites.push('File access permissions');
    }

    return prerequisites;
  }

  /**
   * Create verification steps
   */
  private createVerificationSteps(symptomIds: string[]): VerificationStep[] {
    return [
      {
        id: 'verify_resolution',
        title: 'Verify Issue Resolution',
        description: 'Confirm that your issue has been resolved',
        instructions: [
          'Test the original functionality that was failing',
          'Check if error messages no longer appear',
          'Verify normal operation is restored',
        ],
        type: VerificationType.USER_CONFIRMATION,
        expectedOutcome: 'Issue is resolved and app works normally',
        successMessage: 'Successfully resolved the issue!',
        failureMessage: 'Issue persists. Try additional troubleshooting steps.',
        retryAllowed: true,
        maxRetries: 2,
      },
    ];
  }

  /**
   * Create alternatives
   */
  private createAlternatives(symptomIds: string[]): any[] {
    // Implementation for creating alternatives
    return [];
  }

  /**
   * Find related guides
   */
  private findRelatedGuides(symptomIds: string[]): string[] {
    // Implementation for finding related guides
    return [];
  }

  /**
   * Map error codes to guides
   */
  private mapErrorCodeToGuides(errorCode: string): TroubleshootingGuide[] {
    const guides: TroubleshootingGuide[] = [];

    if (errorCode.includes('network') || errorCode.includes('connection')) {
      const template = this.guideTemplates.get('network_connectivity');
      if (template) {
        guides.push({
          ...template,
          id: `network_${errorCode}`,
          lastUpdated: new Date(),
          version: '1.0.0',
        });
      }
    }

    if (errorCode.includes('audio')) {
      const template = this.guideTemplates.get('audio_playback');
      if (template) {
        guides.push({
          ...template,
          id: `audio_${errorCode}`,
          lastUpdated: new Date(),
          version: '1.0.0',
        });
      }
    }

    return guides;
  }

  /**
   * Find guides by keywords
   */
  private findGuidesByKeywords(errorMessage: string): TroubleshootingGuide[] {
    const guides: TroubleshootingGuide[] = [];
    const keywords = errorMessage.toLowerCase().split(' ');

    for (const [key, template] of this.guideTemplates.entries()) {
      const relevanceScore = this.calculateKeywordRelevance(keywords, template);
      if (relevanceScore > 0.3) {
        guides.push({
          ...template,
          id: `keyword_${key}_${Date.now()}`,
          lastUpdated: new Date(),
          version: '1.0.0',
        });
      }
    }

    return guides;
  }

  /**
   * Find guides by context
   */
  private findGuidesByContext(context: Partial<TroubleshootingContext>): TroubleshootingGuide[] {
    const guides: TroubleshootingGuide[] = [];

    if (context.isMobile) {
      const template = this.guideTemplates.get('mobile_optimization');
      if (template) {
        guides.push({
          ...template,
          id: 'mobile_context_guide',
          lastUpdated: new Date(),
          version: '1.0.0',
        });
      }
    }

    return guides;
  }

  /**
   * Calculate keyword relevance
   */
  private calculateKeywordRelevance(
    keywords: string[],
    template: Omit<TroubleshootingGuide, 'id' | 'lastUpdated' | 'version'>
  ): number {
    const templateText = [
      template.title,
      template.description,
      ...template.tags,
    ].join(' ').toLowerCase();

    const matchCount = keywords.filter(keyword =>
      templateText.includes(keyword)
    ).length;

    return matchCount / keywords.length;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create guidance generator with default configuration
 */
export function createGuidanceGenerator(config?: Partial<TroubleshootingConfig>): GuidanceGenerator {
  const defaultConfig: TroubleshootingConfig = {
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
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new GuidanceGenerator(finalConfig);
}

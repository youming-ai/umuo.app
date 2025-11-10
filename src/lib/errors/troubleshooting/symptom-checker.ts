/**
 * Symptom Checker
 *
 * Intelligent problem diagnosis system that analyzes user responses
 * to identify specific symptoms and recommend appropriate troubleshooting guides.
 */

import {
  TroubleshootingContext,
  Symptom,
  SymptomCategory,
  SymptomSeverity,
  SymptomQuestion,
  SymptomCondition,
  ConditionOperator,
  SymptomAnalysis,
  TroubleshootingConfig,
} from './types';
import { ErrorCategory, ErrorType, ErrorSeverity } from '../error-classifier';

// ============================================================================
// SYMPTOM DEFINITIONS
// ============================================================================

/**
 * Predefined symptoms for common issues
 */
const SYMPTOM_DEFINITIONS: Symptom[] = [
  // Network connectivity symptoms
  {
    id: 'network_connection_lost',
    name: 'Network Connection Lost',
    description: 'Application cannot connect to the internet or API endpoints',
    category: SymptomCategory.NETWORK,
    severity: SymptomSeverity.HIGH,
    questions: [
      {
        id: 'can_browse_other_sites',
        type: 'yes_no',
        question: 'Can you browse other websites successfully?',
        required: true,
        weight: 0.8,
      },
      {
        id: 'wifi_connected',
        type: 'yes_no',
        question: 'Is your device connected to WiFi or cellular network?',
        required: true,
        weight: 0.6,
      },
      {
        id: 'error_message',
        type: 'text_input',
        question: 'What error message do you see?',
        required: false,
        weight: 0.4,
      },
      {
        id: 'recent_network_change',
        type: 'yes_no',
        question: 'Did you recently change your network connection?',
        required: false,
        weight: 0.3,
      },
    ],
    conditions: [
      {
        field: 'can_browse_other_sites',
        operator: ConditionOperator.EQUALS,
        value: false,
      },
      {
        field: 'wifi_connected',
        operator: ConditionOperator.EQUALS,
        value: true,
        logicalOperator: 'OR',
      },
    ],
    relatedIssues: ['slow_connection', 'dns_resolution', 'firewall_blocking'],
    tags: ['network', 'connectivity', 'offline', 'connection'],
    lastUpdated: new Date(),
  },

  // Slow network symptoms
  {
    id: 'slow_connection',
    name: 'Slow Network Connection',
    description: 'Network connection is working but very slow',
    category: SymptomCategory.NETWORK,
    severity: SymptomSeverity.MEDIUM,
    questions: [
      {
        id: 'load_time',
        type: 'numeric_input',
        question: 'How long does it take for pages to load (seconds)?',
        required: true,
        weight: 0.7,
      },
      {
        id: 'other_apps_affected',
        type: 'yes_no',
        question: 'Are other applications also slow?',
        required: true,
        weight: 0.6,
      },
      {
        id: 'connection_type',
        type: 'multiple_choice',
        question: 'What type of connection are you using?',
        options: ['WiFi', 'Cellular (4G/5G)', 'Ethernet', 'Other'],
        required: true,
        weight: 0.5,
      },
      {
        id: 'time_of_day',
        type: 'multiple_choice',
        question: 'When does the slowness occur?',
        options: ['All the time', 'Peak hours', 'Specific times', 'Random'],
        required: false,
        weight: 0.3,
      },
    ],
    conditions: [
      {
        field: 'load_time',
        operator: ConditionOperator.GREATER_THAN,
        value: 10,
      },
      {
        field: 'other_apps_affected',
        operator: ConditionOperator.EQUALS,
        value: true,
        logicalOperator: 'OR',
      },
    ],
    relatedIssues: ['network_connection_lost', 'dns_resolution', 'bandwidth_limit'],
    tags: ['network', 'performance', 'slow', 'latency'],
    lastUpdated: new Date(),
  },

  // Audio playback symptoms
  {
    id: 'audio_no_sound',
    name: 'No Audio During Playback',
    description: 'Audio player loads but no sound is heard',
    category: SymptomCategory.AUDIO_PLAYBACK,
    severity: SymptomSeverity.HIGH,
    questions: [
      {
        id: 'device_volume',
        type: 'yes_no',
        question: 'Is your device volume turned up and not muted?',
        required: true,
        weight: 0.8,
      },
      {
        id: 'other_apps_audio',
        type: 'yes_no',
        question: 'Do other applications play audio correctly?',
        required: true,
        weight: 0.7,
      },
      {
        id: 'headphones',
        type: 'yes_no',
        question: 'Are you using headphones or speakers?',
        required: true,
        weight: 0.5,
      },
      {
        id: 'browser_permissions',
        type: 'yes_no',
        question: 'Have you checked browser audio permissions?',
        required: false,
        weight: 0.6,
      },
      {
        id: 'player_visual_feedback',
        type: 'yes_no',
        question: 'Does the player show visual feedback (waveform, progress bar)?',
        required: false,
        weight: 0.4,
      },
    ],
    conditions: [
      {
        field: 'device_volume',
        operator: ConditionOperator.EQUALS,
        value: true,
      },
      {
        field: 'other_apps_audio',
        operator: ConditionOperator.EQUALS,
        value: true,
      },
      {
        field: 'player_visual_feedback',
        operator: ConditionOperator.EQUALS,
        value: true,
        logicalOperator: 'AND',
      },
    ],
    relatedIssues: ['audio_stuttering', 'audio_format_unsupported', 'browser_compatibility'],
    tags: ['audio', 'playback', 'sound', 'volume', 'headphones'],
    lastUpdated: new Date(),
  },

  // Audio stuttering symptoms
  {
    id: 'audio_stuttering',
    name: 'Audio Stuttering or Cutting Out',
    description: 'Audio playback is choppy, stutters, or cuts out',
    category: SymptomCategory.AUDIO_PLAYBACK,
    severity: SymptomSeverity.MEDIUM,
    questions: [
      {
        id: 'stutter_pattern',
        type: 'multiple_choice',
        question: 'How does the audio stutter?',
        options: ['Frequent short cuts', 'Long pauses', 'Random skips', 'Consistent pattern'],
        required: true,
        weight: 0.7,
      },
      {
        id: 'network_during_playback',
        type: 'yes_no',
        question: 'Does stuttering happen during network streaming?',
        required: true,
        weight: 0.6,
      },
      {
        id: 'local_files_affected',
        type: 'yes_no',
        question: 'Do local audio files also stutter?',
        required: false,
        weight: 0.5,
      },
      {
        id: 'browser_tab',
        type: 'yes_no',
        question: 'Does stuttering improve in a fresh browser tab?',
        required: false,
        weight: 0.4,
      },
      {
        id: 'system_performance',
        type: 'yes_no',
        question: 'Is your computer running slowly overall?',
        required: false,
        weight: 0.3,
      },
    ],
    conditions: [
      {
        field: 'stutter_pattern',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
    ],
    relatedIssues: ['audio_no_sound', 'slow_connection', 'system_resources'],
    tags: ['audio', 'playback', 'stutter', 'performance', 'buffering'],
    lastUpdated: new Date(),
  },

  // File upload symptoms
  {
    id: 'file_upload_fails',
    name: 'File Upload Fails',
    description: 'Unable to upload audio files to the application',
    category: SymptomCategory.FILE_UPLOAD,
    severity: SymptomSeverity.HIGH,
    questions: [
      {
        id: 'file_size',
        type: 'numeric_input',
        question: 'What is the file size (MB)?',
        required: true,
        weight: 0.7,
      },
      {
        id: 'file_format',
        type: 'multiple_choice',
        question: 'What is the file format?',
        options: ['MP3', 'WAV', 'M4A', 'FLAC', 'Other'],
        required: true,
        weight: 0.6,
      },
      {
        id: 'error_stage',
        type: 'multiple_choice',
        question: 'When does the upload fail?',
        options: ['Immediately', 'During upload', 'At the end', 'During processing'],
        required: true,
        weight: 0.8,
      },
      {
        id: 'error_message',
        type: 'text_input',
        question: 'What error message do you see?',
        required: false,
        weight: 0.5,
      },
      {
        id: 'network_stability',
        type: 'yes_no',
        question: 'Is your network connection stable?',
        required: false,
        weight: 0.4,
      },
    ],
    conditions: [
      {
        field: 'error_stage',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
    ],
    relatedIssues: ['file_size_exceeded', 'unsupported_format', 'network_connection_lost'],
    tags: ['upload', 'file', 'transcription', 'processing'],
    lastUpdated: new Date(),
  },

  // Transcription symptoms
  {
    id: 'transcription_fails',
    name: 'Transcription Fails or Errors',
    description: 'Audio transcription process fails or produces errors',
    category: SymptomCategory.TRANSCRIPTION,
    severity: SymptomSeverity.HIGH,
    questions: [
      {
        id: 'failure_point',
        type: 'multiple_choice',
        question: 'When does transcription fail?',
        options: ['Immediately', 'After processing starts', 'Mid-transcription', 'At completion'],
        required: true,
        weight: 0.8,
      },
      {
        id: 'error_code',
        type: 'text_input',
        question: 'What error code or message do you see?',
        required: false,
        weight: 0.6,
      },
      {
        id: 'audio_quality',
        type: 'multiple_choice',
        question: 'How would you describe the audio quality?',
        options: ['Clear', 'Some background noise', 'Very noisy', 'Very quiet', 'Distorted'],
        required: true,
        weight: 0.7,
      },
      {
        id: 'audio_length',
        type: 'numeric_input',
        question: 'How long is the audio (minutes)?',
        required: false,
        weight: 0.4,
      },
      {
        id: 'language',
        type: 'text_input',
        question: 'What language is spoken in the audio?',
        required: false,
        weight: 0.3,
      },
    ],
    conditions: [
      {
        field: 'failure_point',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
    ],
    relatedIssues: ['file_upload_fails', 'audio_quality_poor', 'service_unavailable'],
    tags: ['transcription', 'processing', 'ai_service', 'audio_analysis'],
    lastUpdated: new Date(),
  },

  // Mobile-specific symptoms
  {
    id: 'mobile_battery_drain',
    name: 'Excessive Battery Drain',
    description: 'Application drains battery much faster than expected',
    category: SymptomCategory.MOBILE_SPECIFIC,
    severity: SymptomSeverity.MEDIUM,
    questions: [
      {
        id: 'device_type',
        type: 'multiple_choice',
        question: 'What type of device are you using?',
        options: ['iOS iPhone', 'iOS iPad', 'Android Phone', 'Android Tablet'],
        required: true,
        weight: 0.6,
      },
      {
        id: 'usage_pattern',
        type: 'multiple_choice',
        question: 'When does battery drain occur?',
        options: ['During transcription', 'During playback', 'Always', 'Background'],
        required: true,
        weight: 0.7,
      },
      {
        id: 'battery_percentage_per_hour',
        type: 'numeric_input',
        question: 'How much battery percentage per hour is lost?',
        required: false,
        weight: 0.5,
      },
      {
        id: 'other_apps_battery',
        type: 'yes_no',
        question: 'Do other apps also drain battery quickly?',
        required: false,
        weight: 0.4,
      },
      {
        id: 'battery_optimization',
        type: 'yes_no',
        question: 'Have you checked battery optimization settings?',
        required: false,
        weight: 0.6,
      },
    ],
    conditions: [
      {
        field: 'usage_pattern',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
    ],
    relatedIssues: ['mobile_performance_slow', 'background_processing'],
    tags: ['mobile', 'battery', 'performance', 'optimization'],
    lastUpdated: new Date(),
  },

  // Browser compatibility symptoms
  {
    id: 'browser_compatibility',
    name: 'Browser Compatibility Issues',
    description: 'Application doesn\'t work correctly in current browser',
    category: SymptomCategory.BROWSER_COMPATIBILITY,
    severity: SymptomSeverity.MEDIUM,
    questions: [
      {
        id: 'browser_name',
        type: 'multiple_choice',
        question: 'What browser are you using?',
        options: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Other'],
        required: true,
        weight: 0.8,
      },
      {
        id: 'browser_version',
        type: 'text_input',
        question: 'What is your browser version?',
        required: false,
        weight: 0.6,
      },
      {
        id: 'features_affected',
        type: 'checkbox',
        question: 'Which features are affected?',
        options: ['Audio playback', 'File upload', 'Transcription', 'UI display', 'All features'],
        required: true,
        weight: 0.7,
      },
      {
        id: 'other_browsers_work',
        type: 'yes_no',
        question: 'Does the application work in other browsers?',
        required: false,
        weight: 0.6,
      },
      {
        id: 'recent_browser_update',
        type: 'yes_no',
        question: 'Did you recently update your browser?',
        required: false,
        weight: 0.4,
      },
    ],
    conditions: [
      {
        field: 'browser_name',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
      {
        field: 'features_affected',
        operator: ConditionOperator.IS_NOT_EMPTY,
        value: null,
      },
    ],
    relatedIssues: ['audio_no_sound', 'file_upload_fails', 'ui_display_issues'],
    tags: ['browser', 'compatibility', 'chrome', 'firefox', 'safari'],
    lastUpdated: new Date(),
  },
];

// ============================================================================
// MAIN SYMPTOM CHECKER CLASS
// ============================================================================

/**
 * Symptom checker for problem diagnosis
 */
export class SymptomChecker {
  private symptoms: Map<string, Symptom> = new Map();
  private config: TroubleshootingConfig;

  constructor(config: TroubleshootingConfig) {
    this.config = config;
    this.loadSymptomDefinitions();
  }

  /**
   * Analyze symptoms based on user answers
   */
  public async analyzeSymptoms(
    context: TroubleshootingContext,
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> {
    const analyses: SymptomAnalysis[] = [];

    // Check each symptom definition
    for (const symptom of this.symptoms.values()) {
      const analysis = await this.evaluateSymptom(symptom, context, answers);

      if (analysis.confidence >= 0.5) { // Minimum confidence threshold
        analyses.push(analysis);
      }
    }

    // Sort by confidence (highest first)
    analyses.sort((a, b) => b.confidence - a.confidence);

    // Apply context-based filtering and scoring
    return this.applyContextScoring(analyses, context);
  }

  /**
   * Get questions for a specific category
   */
  public getQuestionsForCategory(category: SymptomCategory): SymptomQuestion[] {
    const categorySymptoms = Array.from(this.symptoms.values())
      .filter(symptom => symptom.category === category);

    // Get unique questions from all symptoms in category
    const questionsMap = new Map<string, SymptomQuestion>();

    categorySymptoms.forEach(symptom => {
      symptom.questions.forEach(question => {
        if (!questionsMap.has(question.id)) {
          questionsMap.set(question.id, question);
        }
      });
    });

    return Array.from(questionsMap.values())
      .sort((a, b) => b.weight - a.weight); // Sort by weight (highest first)
  }

  /**
   * Get symptom by ID
   */
  public getSymptom(symptomId: string): Symptom | undefined {
    return this.symptoms.get(symptomId);
  }

  /**
   * Get all symptoms
   */
  public getAllSymptoms(): Symptom[] {
    return Array.from(this.symptoms.values());
  }

  /**
   * Get symptoms by category
   */
  public getSymptomsByCategory(category: SymptomCategory): Symptom[] {
    return Array.from(this.symptoms.values())
      .filter(symptom => symptom.category === category);
  }

  /**
   * Search symptoms by tags or keywords
   */
  public searchSymptoms(query: string, category?: SymptomCategory): Symptom[] {
    const searchTerm = query.toLowerCase();
    let symptoms = Array.from(this.symptoms.values());

    if (category) {
      symptoms = symptoms.filter(symptom => symptom.category === category);
    }

    return symptoms.filter(symptom =>
      symptom.name.toLowerCase().includes(searchTerm) ||
      symptom.description.toLowerCase().includes(searchTerm) ||
      symptom.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Add custom symptom
   */
  public addSymptom(symptom: Symptom): void {
    this.symptoms.set(symptom.id, symptom);
  }

  /**
   * Update symptom
   */
  public updateSymptom(symptomId: string, updates: Partial<Symptom>): void {
    const existing = this.symptoms.get(symptomId);
    if (existing) {
      const updated = { ...existing, ...updates, lastUpdated: new Date() };
      this.symptoms.set(symptomId, updated);
    }
  }

  /**
   * Remove symptom
   */
  public removeSymptom(symptomId: string): void {
    this.symptoms.delete(symptomId);
  }

  /**
   * Validate symptom definition
   */
  public validateSymptom(symptom: Symptom): boolean {
    // Basic validation
    if (!symptom.id || !symptom.name || !symptom.description) {
      return false;
    }

    if (!symptom.questions || symptom.questions.length === 0) {
      return false;
    }

    if (!symptom.conditions || symptom.conditions.length === 0) {
      return false;
    }

    // Validate questions
    for (const question of symptom.questions) {
      if (!question.id || !question.type || !question.question) {
        return false;
      }

      if (question.required && !question.weight) {
        return false;
      }
    }

    // Validate conditions
    for (const condition of symptom.conditions) {
      if (!condition.field || !condition.operator) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: TroubleshootingConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy symptom checker
   */
  public destroy(): void {
    this.symptoms.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load symptom definitions
   */
  private loadSymptomDefinitions(): void {
    // Load predefined symptoms
    SYMPTOM_DEFINITIONS.forEach(symptom => {
      this.symptoms.set(symptom.id, symptom);
    });

    // Load custom symptoms from storage if available
    this.loadCustomSymptoms();
  }

  /**
   * Load custom symptoms from storage
   */
  private async loadCustomSymptoms(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Load from localStorage or IndexedDB
      const customSymptoms = localStorage.getItem('troubleshooting_custom_symptoms');
      if (customSymptoms) {
        const symptoms = JSON.parse(customSymptoms) as Symptom[];
        symptoms.forEach(symptom => {
          if (this.validateSymptom(symptom)) {
            this.symptoms.set(symptom.id, symptom);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load custom symptoms:', error);
    }
  }

  /**
   * Evaluate a single symptom
   */
  private async evaluateSymptom(
    symptom: Symptom,
    context: TroubleshootingContext,
    answers: Record<string, any>
  ): Promise<SymptomAnalysis> {
    let confidence = 0;
    const matchingConditions: string[] = [];

    // Evaluate conditions
    for (const condition of symptom.conditions) {
      if (this.evaluateCondition(condition, answers, context)) {
        matchingConditions.push(condition.field);
        confidence += 0.3; // Base confidence for matching condition
      }
    }

    // Evaluate question answers
    let totalWeight = 0;
    let weightedScore = 0;

    for (const question of symptom.questions) {
      const answer = answers[question.id];
      if (answer !== undefined) {
        totalWeight += question.weight;

        // Score the answer based on question type and expected response
        const questionScore = this.scoreAnswer(question, answer, symptom);
        weightedScore += questionScore * question.weight;
      }
    }

    // Combine condition and question scores
    if (totalWeight > 0) {
      confidence += (weightedScore / totalWeight) * 0.7; // 70% weight for answers
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      symptomId: symptom.id,
      confidence,
      matchingConditions,
      answers,
      relatedSymptoms: symptom.relatedIssues,
      suggestedGuides: [], // Will be populated by guidance generator
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: SymptomCondition,
    answers: Record<string, any>,
    context: TroubleshootingContext
  ): boolean {
    const value = answers[condition.field] || this.getContextValue(condition.field, context);

    if (value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return value === condition.value;
      case ConditionOperator.NOT_EQUALS:
        return value !== condition.value;
      case ConditionOperator.CONTAINS:
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case ConditionOperator.STARTS_WITH:
        return String(value).toLowerCase().startsWith(String(condition.value).toLowerCase());
      case ConditionOperator.ENDS_WITH:
        return String(value).toLowerCase().endsWith(String(condition.value).toLowerCase());
      case ConditionOperator.GREATER_THAN:
        return Number(value) > Number(condition.value);
      case ConditionOperator.LESS_THAN:
        return Number(value) < Number(condition.value);
      case ConditionOperator.GREATER_THAN_EQUAL:
        return Number(value) >= Number(condition.value);
      case ConditionOperator.LESS_THAN_EQUAL:
        return Number(value) <= Number(condition.value);
      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(value);
      case ConditionOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case ConditionOperator.IS_EMPTY:
        return !value || value === '' || value === null;
      case ConditionOperator.IS_NOT_EMPTY:
        return value && value !== '' && value !== null;
      case ConditionOperator.MATCHES_REGEX:
        try {
          return new RegExp(condition.value).test(String(value));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Get value from context
   */
  private getContextValue(field: string, context: TroubleshootingContext): any {
    switch (field) {
      case 'isMobile':
        return context.isMobile;
      case 'platform':
        return context.platform;
      case 'networkType':
        return context.networkType;
      default:
        return undefined;
    }
  }

  /**
   * Score an answer based on question type and expected response
   */
  private scoreAnswer(question: SymptomQuestion, answer: any, symptom: Symptom): number {
    // Base scoring logic
    switch (question.type) {
      case 'yes_no':
        // For yes/no questions, positive indicators get higher scores
        return this.scoreYesNoAnswer(question, answer, symptom);
      case 'multiple_choice':
        return this.scoreMultipleChoiceAnswer(question, answer, symptom);
      case 'text_input':
        return this.scoreTextAnswer(question, answer, symptom);
      case 'numeric_input':
        return this.scoreNumericAnswer(question, answer, symptom);
      case 'checkbox':
        return this.scoreCheckboxAnswer(question, answer, symptom);
      default:
        return 0.5; // Neutral score for unknown question types
    }
  }

  /**
   * Score yes/no answers
   */
  private scoreYesNoAnswer(question: SymptomQuestion, answer: boolean, symptom: Symptom): number {
    // Context-dependent scoring for yes/no answers
    switch (symptom.category) {
      case SymptomCategory.NETWORK:
        // For network issues, "no" answers often indicate problems
        return answer ? 0.3 : 0.8;
      case SymptomCategory.AUDIO_PLAYBACK:
        // For audio issues, depends on the specific question
        if (question.id === 'device_volume' || question.id === 'other_apps_audio') {
          return answer ? 0.8 : 0.2; // "Yes" is good for these questions
        }
        return answer ? 0.5 : 0.7;
      default:
        return answer ? 0.6 : 0.4;
    }
  }

  /**
   * Score multiple choice answers
   */
  private scoreMultipleChoiceAnswer(question: SymptomQuestion, answer: string, symptom: Symptom): number {
    // Context-dependent scoring for multiple choice
    switch (symptom.category) {
      case SymptomCategory.NETWORK:
        if (question.id === 'connection_type') {
          // Mobile connections are less reliable for processing
          return answer.includes('Cellular') ? 0.7 : 0.4;
        }
        break;
      case SymptomCategory.AUDIO_PLAYBACK:
        if (question.id === 'file_format') {
          // Some formats are more problematic
          const problematicFormats = ['FLAC', 'Other'];
          return problematicFormats.includes(answer) ? 0.7 : 0.3;
        }
        break;
    }

    return 0.5; // Neutral score
  }

  /**
   * Score text answers
   */
  private scoreTextAnswer(question: SymptomQuestion, answer: string, symptom: Symptom): number {
    if (!answer || answer.trim().length === 0) {
      return 0.1; // Low score for empty answers
    }

    // Look for keywords that indicate problems
    const problemKeywords = [
      'error', 'failed', 'timeout', 'unable', 'cannot', 'not',
      'slow', 'stuck', 'crash', 'freeze', 'corrupt', 'invalid'
    ];

    const hasProblemKeywords = problemKeywords.some(keyword =>
      answer.toLowerCase().includes(keyword)
    );

    return hasProblemKeywords ? 0.8 : 0.3;
  }

  /**
   * Score numeric answers
   */
  private scoreNumericAnswer(question: SymptomQuestion, answer: number, symptom: Symptom): number {
    // Context-dependent scoring for numeric answers
    switch (symptom.category) {
      case SymptomCategory.NETWORK:
        if (question.id === 'load_time') {
          // Higher load times are worse
          return Math.min(answer / 30, 1.0); // Normalize to 0-1, max at 30 seconds
        }
        break;
      case SymptomCategory.FILE_UPLOAD:
        if (question.id === 'file_size') {
          // Larger files may cause issues
          return Math.min(answer / 100, 1.0); // Normalize to 0-1, max at 100MB
        }
        break;
      case SymptomCategory.TRANSCRIPTION:
        if (question.id === 'audio_length') {
          // Very long audio may cause timeouts
          return Math.min(answer / 60, 1.0); // Normalize to 0-1, max at 60 minutes
        }
        break;
    }

    return 0.5; // Neutral score
  }

  /**
   * Score checkbox answers
   */
  private scoreCheckboxAnswer(question: SymptomQuestion, answer: string[], symptom: Symptom): number {
    if (!answer || answer.length === 0) {
      return 0.1;
    }

    // More selections often indicate more widespread problems
    return Math.min(answer.length / question.options!.length, 1.0);
  }

  /**
   * Apply context-based scoring adjustments
   */
  private applyContextScoring(
    analyses: SymptomAnalysis[],
    context: TroubleshootingContext
  ): SymptomAnalysis[] {
    return analyses.map(analysis => {
      let adjustedConfidence = analysis.confidence;
      const symptom = this.symptoms.get(analysis.symptomId);

      if (!symptom) {
        return analysis;
      }

      // Mobile context adjustments
      if (context.isMobile) {
        if (symptom.category === SymptomCategory.MOBILE_SPECIFIC) {
          adjustedConfidence += 0.2; // Boost confidence for mobile-specific issues
        }

        // Reduce confidence for desktop-specific issues
        if (symptom.tags.includes('desktop_only')) {
          adjustedConfidence -= 0.3;
        }
      }

      // Network context adjustments
      if (context.networkType === 'slow-2g' || context.networkType === '2g') {
        if (symptom.category === SymptomCategory.NETWORK) {
          adjustedConfidence += 0.15;
        }
      }

      // Browser context adjustments
      if (context.browserInfo) {
        const browserName = context.browserInfo.name.toLowerCase();

        // Boost confidence for known browser compatibility issues
        if (symptom.category === SymptomCategory.BROWSER_COMPATIBILITY) {
          if (symptom.tags.includes(browserName)) {
            adjustedConfidence += 0.1;
          }
        }
      }

      // Ensure confidence stays within bounds
      adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

      return {
        ...analysis,
        confidence: adjustedConfidence,
      };
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create symptom checker with default configuration
 */
export function createSymptomChecker(config?: Partial<TroubleshootingConfig>): SymptomChecker {
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
  return new SymptomChecker(finalConfig);
}

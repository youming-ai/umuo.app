/**
 * Knowledge Base
 *
 * Comprehensive knowledge base system for FAQ entries, error explanations,
 * best practices, tutorials, and reference materials with search functionality.
 */

import {
  KnowledgeBaseEntry,
  FAQ,
  ContentType,
  SymptomCategory,
  TroubleshootingGuide,
  TroubleshootingConfig,
  UserFeedback,
  ContentStatus,
  ContentAuthor,
} from './types';

// ============================================================================
// KNOWLEDGE BASE DATA
// ============================================================================

/**
 * Default FAQ entries
 */
const DEFAULT_FAQS: FAQ[] = [
  {
    id: 'network_connection',
    question: 'Why can\'t I connect to the transcription service?',
    answer: 'Network connection issues can be caused by several factors: 1) Check your internet connection by visiting other websites, 2) Verify that firewalls or VPNs aren\'t blocking the connection, 3) Try refreshing the page or restarting your browser, 4) Contact your network administrator if you\'re on a corporate network.',
    category: SymptomCategory.NETWORK,
    relatedErrors: ['CONNECTION_FAILURE', 'TIMEOUT_ERROR'],
    relatedGuides: ['network_troubleshooting', 'firewall_configuration'],
    helpfulCount: 45,
    viewCount: 230,
    lastUpdated: new Date(),
  },

  {
    id: 'audio_upload_fails',
    question: 'Why does my audio file upload fail?',
    answer: 'Audio upload failures can occur due to: 1) File size exceeding the limit (typically 100MB), 2) Unsupported audio format (use MP3, WAV, or M4A), 3) Network connection issues during upload, 4) Corrupted audio files. Try compressing your audio, converting to MP3 format, or checking your internet connection.',
    category: SymptomCategory.FILE_UPLOAD,
    relatedErrors: ['FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT'],
    relatedGuides: ['file_upload_troubleshooting', 'audio_format_conversion'],
    helpfulCount: 38,
    viewCount: 189,
    lastUpdated: new Date(),
  },

  {
    id: 'transcription_quality_poor',
    question: 'How can I improve transcription quality?',
    answer: 'To get better transcription results: 1) Use high-quality audio recordings (clear voice, minimal background noise), 2) Speak clearly and at a moderate pace, 3) Use a good microphone placed close to the speaker, 4) Ensure proper audio levels (not too quiet or distorted), 5) Select the correct language setting, 6) Break long recordings into smaller segments.',
    category: SymptomCategory.TRANSCRIPTION,
    relatedErrors: ['TRANSCRIPTION_QUALITY_POOR', 'ACCURACY_LOW'],
    relatedGuides: ['audio_recording_best_practices', 'transcription_optimization'],
    helpfulCount: 62,
    viewCount: 298,
    lastUpdated: new Date(),
  },

  {
    id: 'mobile_battery_drain',
    question: 'Why does the app drain my mobile battery quickly?',
    answer: 'Battery drain on mobile devices can be reduced by: 1) Closing other apps running in the background, 2) Reducing screen brightness during use, 3) Using WiFi instead of cellular data when possible, 4) Enabling battery optimization settings for the app, 5) Avoiding running transcriptions while charging, 6) Using headphones instead of speaker to reduce processing load.',
    category: SymptomCategory.MOBILE_SPECIFIC,
    relatedErrors: ['BATTERY_DRAIN_HIGH', 'PERFORMANCE_SLOW'],
    relatedGuides: ['mobile_optimization', 'battery_saving_tips'],
    helpfulCount: 29,
    viewCount: 134,
    lastUpdated: new Date(),
  },

  {
    id: 'playback_no_sound',
    question: 'Why can\'t I hear audio during playback?',
    answer: 'If you can\'t hear audio during playback: 1) Check your device volume and make sure it\'s not muted, 2) Verify that other apps can play audio, 3) Check if headphones are properly connected, 4) Ensure browser has audio permissions, 5) Try refreshing the page, 6) Check if your browser supports the audio format, 7) Disable any ad blockers that might interfere with audio playback.',
    category: SymptomCategory.AUDIO_PLAYBACK,
    relatedErrors: ['AUDIO_NO_SOUND', 'PLAYBACK_FAILED'],
    relatedGuides: ['audio_troubleshooting', 'browser_compatibility'],
    helpfulCount: 41,
    viewCount: 201,
    lastUpdated: new Date(),
  },

  {
    id: 'browser_compatibility',
    question: 'Which browsers are supported?',
    answer: 'The application works best on modern browsers: Chrome (version 90+), Firefox (version 88+), Safari (version 14+), Edge (version 90+). For the best experience, keep your browser updated to the latest version. Some features may not work properly on older browsers or Internet Explorer.',
    category: SymptomCategory.BROWSER_COMPATIBILITY,
    relatedErrors: ['BROWSER_NOT_SUPPORTED', 'FEATURE_NOT_AVAILABLE'],
    relatedGuides: ['browser_setup', 'compatibility_guide'],
    helpfulCount: 33,
    viewCount: 156,
    lastUpdated: new Date(),
  },

  {
    id: 'transcription_timeout',
    question: 'Why does transcription take so long or timeout?',
    answer: 'Transcription processing time depends on: 1) Audio length (longer files take more time), 2) Server load and processing queue, 3) Audio quality and complexity, 4) Network connection stability. Typical processing time is 1-3 minutes for 10 minutes of audio. If it times out, try: 1) Using shorter audio segments, 2) Checking your internet connection, 3) Trying again later when servers are less busy.',
    category: SymptomCategory.TRANSCRIPTION,
    relatedErrors: ['TRANSCRIPTION_TIMEOUT', 'PROCESSING_TOO_LONG'],
    relatedGuides: ['transcription_optimization', 'performance_tips'],
    helpfulCount: 27,
    viewCount: 124,
    lastUpdated: new Date(),
  },

  {
    id: 'storage_full',
    question: 'How do I manage my storage space?',
    answer: 'To manage storage space: 1) Delete old transcriptions you no longer need, 2) Download important transcripts and delete them from the app, 3) Clear browser cache regularly, 4) Use the built-in storage management tools to see what\'s using space, 5) Consider upgrading to a premium plan for more storage if needed.',
    category: SymptomCategory.PERFORMANCE,
    relatedErrors: ['STORAGE_FULL', 'QUOTA_EXCEEDED'],
    relatedGuides: ['storage_management', 'data_cleanup'],
    helpfulCount: 19,
    viewCount: 87,
    lastUpdated: new Date(),
  },

  {
    id: 'offline_usage',
    question: 'Can I use the app offline?',
    answer: 'Limited offline functionality is available: 1) You can view previously downloaded transcripts, 2) Audio playback works for downloaded files, 3) New transcriptions require an internet connection, 4) Some features may be limited offline. For full functionality, ensure you have a stable internet connection.',
    category: SymptomCategory.NETWORK,
    relatedErrors: ['OFFLINE_MODE_LIMITED', 'FEATURE_UNAVAILABLE_OFFLINE'],
    relatedGuides: ['offline_usage_guide', 'network_requirements'],
    helpfulCount: 15,
    viewCount: 67,
    lastUpdated: new Date(),
  },

  {
    id: 'account_login_issues',
    question: 'Why can\'t I log in to my account?',
    answer: 'Login issues can be resolved by: 1) Checking that your email and password are correct, 2) Using the "Forgot Password" link to reset your password, 3) Ensuring your email address is verified, 4) Clearing browser cookies and cache, 5) Trying a different browser, 6) Checking if your account is suspended or expired, 7) Contacting support if the issue persists.',
    category: SymptomCategory.AUTHENTICATION,
    relatedErrors: ['LOGIN_FAILED', 'ACCOUNT_NOT_FOUND'],
    relatedGuides: ['account_troubleshooting', 'password_reset_guide'],
    helpfulCount: 23,
    viewCount: 112,
    lastUpdated: new Date(),
  },
];

/**
 * Default knowledge base entries
 */
const DEFAULT_KNOWLEDGE_ENTRIES: KnowledgeBaseEntry[] = [
  {
    id: 'error_codes_reference',
    title: 'Error Codes Reference',
    content: `# Common Error Codes

## Network Errors
- **CONNECTION_FAILURE**: Unable to connect to the server
- **TIMEOUT_ERROR**: Request timed out
- **NETWORK_UNAVAILABLE**: No internet connection

## File Errors
- **FILE_TOO_LARGE**: File exceeds size limit (100MB)
- **UNSUPPORTED_FORMAT**: Audio format not supported
- **CORRUPTED_FILE**: File is corrupted or damaged

## Transcription Errors
- **TRANSCRIPTION_TIMEOUT**: Processing took too long
- **SERVICE_UNAVAILABLE**: Transcription service is down
- **QUALITY_POOR**: Audio quality too low for accurate transcription

## Account Errors
- **AUTHENTICATION_FAILED**: Invalid login credentials
- **ACCOUNT_SUSPENDED**: Account has been suspended
- **QUOTA_EXCEEDED**: Usage limit reached`,
    type: ContentType.ERROR_EXPLANATION,
    category: SymptomCategory.GENERAL,
    tags: ['error-codes', 'reference', 'troubleshooting'],
    relatedErrors: [],
    relatedGuides: [],
    searchTerms: ['error', 'code', 'meaning', 'explanation'],
    viewCount: 345,
    helpfulCount: 78,
    author: 'system',
    lastUpdated: new Date(),
    version: '1.0.0',
  },

  {
    id: 'audio_recording_best_practices',
    title: 'Audio Recording Best Practices',
    content: `# Best Practices for Audio Recording

## Environment Setup
- Choose a quiet location with minimal background noise
- Close windows and doors to reduce outside sounds
- Turn off fans, air conditioners, and other noisy appliances
- Use soft furnishings to reduce echo and reverb

## Microphone Technique
- Position microphone 6-12 inches from your mouth
- Speak directly into the microphone
- Maintain consistent distance and volume
- Use a pop filter to reduce plosive sounds

## Speaking Guidelines
- Speak clearly and at a moderate pace
- Enunciate words properly
- Avoid mumbling or speaking too quickly
- Take natural pauses between sentences

## Technical Settings
- Sample rate: 44.1kHz or 48kHz
- Bit depth: 16-bit or 24-bit
- Format: WAV or high-quality MP3 (320kbps)
- Avoid heavy compression or processing

## Testing
- Do a short test recording before the main session
- Listen back to check for issues
- Monitor levels to avoid clipping or distortion`,
    type: ContentType.BEST_PRACTICE,
    category: SymptomCategory.AUDIO_PLAYBACK,
    tags: ['audio', 'recording', 'quality', 'best-practices'],
    relatedErrors: ['AUDIO_QUALITY_POOR', 'TRANSCRIPTION_QUALITY_POOR'],
    relatedGuides: ['transcription_optimization', 'equipment_guide'],
    searchTerms: ['recording', 'microphone', 'audio', 'quality'],
    viewCount: 256,
    helpfulCount: 91,
    author: 'audio_expert',
    lastUpdated: new Date(),
    version: '1.2.0',
  },

  {
    id: 'network_troubleshooting',
    title: 'Network Connection Troubleshooting',
    content: `# Network Connection Troubleshooting

## Basic Checks
1. **Test Internet Connection**
   - Visit other websites to confirm connectivity
   - Try loading a speed test website
   - Check if other devices on the same network have issues

2. **Restart Network Equipment**
   - Unplug router and modem for 30 seconds
   - Plug back in and wait for full startup
   - Restart your device

3. **Check Network Settings**
   - Verify WiFi is connected and signal is strong
   - Try switching between WiFi and cellular data
   - Disable VPN or proxy temporarily

## Advanced Troubleshooting
1. **DNS Issues**
   - Try changing DNS servers to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare)
   - Flush DNS cache: ipconfig /flushdns (Windows) or sudo dscacheutil -flushcache (Mac)

2. **Firewall and Security**
   - Check firewall settings aren't blocking the app
   - Temporarily disable antivirus software
   - Add the app to security exceptions

3. **Browser Issues**
   - Clear browser cache and cookies
   - Disable browser extensions
   - Try a different browser

## Contact Support
If issues persist, contact your Internet Service Provider or network administrator.`,
    type: ContentType.TUTORIAL,
    category: SymptomCategory.NETWORK,
    tags: ['network', 'connection', 'troubleshooting', 'internet'],
    relatedErrors: ['CONNECTION_FAILURE', 'TIMEOUT_ERROR', 'NETWORK_UNAVAILABLE'],
    relatedGuides: ['firewall_configuration', 'browser_troubleshooting'],
    searchTerms: ['network', 'internet', 'connection', 'wifi', 'offline'],
    viewCount: 189,
    helpfulCount: 67,
    author: 'network_specialist',
    lastUpdated: new Date(),
    version: '1.1.0',
  },
];

// ============================================================================
// MAIN KNOWLEDGE BASE CLASS
// ============================================================================

/**
 * Knowledge base for FAQ and guides
 */
export class KnowledgeBase {
  private config: TroubleshootingConfig;
  private faqs = new Map<string, FAQ>();
  private entries = new Map<string, KnowledgeBaseEntry>();
  private searchIndex = new Map<string, Set<string>>();
  private feedbackData = new Map<string, UserFeedback[]>();

  constructor(config: TroubleshootingConfig) {
    this.config = config;
    this.loadDefaultContent();
    this.buildSearchIndex();
  }

  /**
   * Search knowledge base
   */
  public async search(
    query: string,
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: KnowledgeBaseEntry[] = [];

    // Search in entries
    for (const entry of this.entries.values()) {
      if (category && entry.category !== category) {
        continue;
      }

      const score = this.calculateSearchScore(entry, normalizedQuery);
      if (score > 0) {
        results.push({ ...entry, _searchScore: score } as any);
      }
    }

    // Sort by relevance score
    results.sort((a, b) => (b as any)._searchScore - (a as any)._searchScore);

    return results.slice(0, limit);
  }

  /**
   * Get FAQ entries
   */
  public async getFAQs(
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<FAQ[]> {
    let faqs = Array.from(this.faqs.values());

    if (category) {
      faqs = faqs.filter(faq => faq.category === category);
    }

    // Sort by view count and helpful ratio
    faqs.sort((a, b) => {
      const aScore = (a.helpfulCount / Math.max(a.viewCount, 1)) * a.viewCount;
      const bScore = (b.helpfulCount / Math.max(b.viewCount, 1)) * b.viewCount;
      return bScore - aScore;
    });

    return faqs.slice(0, limit);
  }

  /**
   * Get knowledge base entry by ID
   */
  public getEntry(id: string): KnowledgeBaseEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get FAQ by ID
   */
  public getFAQ(id: string): FAQ | undefined {
    return this.faqs.get(id);
  }

  /**
   * Add knowledge base entry
   */
  public addEntry(entry: KnowledgeBaseEntry): void {
    this.entries.set(entry.id, entry);
    this.updateSearchIndex(entry);
  }

  /**
   * Update knowledge base entry
   */
  public updateEntry(id: string, updates: Partial<KnowledgeBaseEntry>): void {
    const existing = this.entries.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: new Date(),
        version: this.incrementVersion(existing.version),
      };
      this.entries.set(id, updated);
      this.updateSearchIndex(updated);
    }
  }

  /**
   * Delete knowledge base entry
   */
  public deleteEntry(id: string): void {
    this.entries.delete(id);
    this.removeFromSearchIndex(id);
  }

  /**
   * Add FAQ
   */
  public addFAQ(faq: FAQ): void {
    this.faqs.set(faq.id, faq);
  }

  /**
   * Update FAQ
   */
  public updateFAQ(id: string, updates: Partial<FAQ>): void {
    const existing = this.faqs.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: new Date(),
      };
      this.faqs.set(id, updated);
    }
  }

  /**
   * Delete FAQ
   */
  public deleteFAQ(id: string): void {
    this.faqs.delete(id);
  }

  /**
   * Get popular entries
   */
  public async getPopularEntries(
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> {
    let entries = Array.from(this.entries.values());

    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }

    // Sort by popularity (view count and helpful count)
    entries.sort((a, b) => {
      const aScore = a.viewCount + (a.helpfulCount * 2);
      const bScore = b.viewCount + (b.helpfulCount * 2);
      return bScore - aScore;
    });

    return entries.slice(0, limit);
  }

  /**
   * Get recent entries
   */
  public async getRecentEntries(
    category?: SymptomCategory,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> {
    let entries = Array.from(this.entries.values());

    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }

    // Sort by last updated date
    entries.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    return entries.slice(0, limit);
  }

  /**
   * Get entries by tags
   */
  public async getEntriesByTags(
    tags: string[],
    category?: SymptomCategory,
    limit: number = 20
  ): Promise<KnowledgeBaseEntry[]> {
    let entries = Array.from(this.entries.values());

    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }

    // Filter by tags
    entries = entries.filter(entry =>
      tags.some(tag => entry.tags.includes(tag))
    );

    return entries.slice(0, limit);
  }

  /**
   * Record feedback for an entry
   */
  public async recordFeedback(feedback: UserFeedback): Promise<void> {
    const entryId = feedback as any; // Would need entryId in feedback
    if (!entryId) return;

    if (!this.feedbackData.has(entryId)) {
      this.feedbackData.set(entryId, []);
    }

    this.feedbackData.get(entryId)!.push(feedback);

    // Update entry helpful counts
    const entry = this.entries.get(entryId);
    if (entry) {
      if (feedback.helpful) {
        entry.helpfulCount++;
      } else {
        entry.notHelpfulCount++;
      }
    }

    const faq = this.faqs.get(entryId);
    if (faq) {
      if (feedback.helpful) {
        faq.helpfulCount++;
      } else {
        // FAQ doesn't have notHelpfulCount in the interface
      }
    }
  }

  /**
   * Get feedback statistics
   */
  public getFeedbackStats(entryId: string): {
    total: number;
    helpful: number;
    notHelpful: number;
    averageRating: number;
  } {
    const feedback = this.feedbackData.get(entryId) || [];

    const helpful = feedback.filter(f => f.helpful).length;
    const notHelpful = feedback.length - helpful;
    const averageRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    return {
      total: feedback.length,
      helpful,
      notHelpful,
      averageRating,
    };
  }

  /**
   * Get related entries
   */
  public async getRelatedEntries(
    entryId: string,
    limit: number = 5
  ): Promise<KnowledgeBaseEntry[]> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      return [];
    }

    const related: Array<{ entry: KnowledgeBaseEntry; score: number }> = [];

    // Find related entries based on tags and category
    for (const otherEntry of this.entries.values()) {
      if (otherEntry.id === entryId) continue;

      let score = 0;

      // Same category
      if (otherEntry.category === entry.category) {
        score += 0.3;
      }

      // Shared tags
      const sharedTags = entry.tags.filter(tag => otherEntry.tags.includes(tag));
      score += sharedTags.length * 0.2;

      // Similar title/content (simple keyword matching)
      const entryWords = entry.title.toLowerCase().split(' ');
      const otherWords = otherEntry.title.toLowerCase().split(' ');
      const sharedWords = entryWords.filter(word =>
        word.length > 3 && otherWords.includes(word)
      );
      score += sharedWords.length * 0.1;

      if (score > 0) {
        related.push({ entry: otherEntry, score });
      }
    }

    // Sort by relevance score and return top results
    related.sort((a, b) => b.score - a.score);
    return related.slice(0, limit).map(r => r.entry);
  }

  /**
   * Export knowledge base data
   */
  public exportData(): {
    faqs: FAQ[];
    entries: KnowledgeBaseEntry[];
    feedback: Record<string, UserFeedback[]>;
  } {
    return {
      faqs: Array.from(this.faqs.values()),
      entries: Array.from(this.entries.values()),
      feedback: Object.fromEntries(this.feedbackData),
    };
  }

  /**
   * Import knowledge base data
   */
  public importData(data: {
    faqs?: FAQ[];
    entries?: KnowledgeBaseEntry[];
    feedback?: Record<string, UserFeedback[]>;
  }): void {
    if (data.faqs) {
      data.faqs.forEach(faq => this.faqs.set(faq.id, faq));
    }

    if (data.entries) {
      data.entries.forEach(entry => {
        this.entries.set(entry.id, entry);
        this.updateSearchIndex(entry);
      });
    }

    if (data.feedback) {
      Object.entries(data.feedback).forEach(([entryId, feedback]) => {
        this.feedbackData.set(entryId, feedback);
      });
    }
  }

  /**
   * Get knowledge base statistics
   */
  public getStatistics(): {
    totalEntries: number;
    totalFAQs: number;
    totalViews: number;
    totalFeedback: number;
    categoryBreakdown: Record<SymptomCategory, number>;
    mostViewed: KnowledgeBaseEntry[];
    mostHelpful: FAQ[];
  } {
    const entries = Array.from(this.entries.values());
    const faqs = Array.from(this.faqs.values());

    const categoryBreakdown = {} as Record<SymptomCategory, number>;
    entries.forEach(entry => {
      categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] || 0) + 1;
    });

    const mostViewed = entries
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    const mostHelpful = faqs
      .sort((a, b) => b.helpfulCount - a.helpfulCount)
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalFAQs: faqs.length,
      totalViews: entries.reduce((sum, entry) => sum + entry.viewCount, 0),
      totalFeedback: Array.from(this.feedbackData.values())
        .reduce((sum, feedback) => sum + feedback.length, 0),
      categoryBreakdown,
      mostViewed,
      mostHelpful,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: TroubleshootingConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clean up old data
   */
  public cleanup(olderThanDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Clean up old feedback
    for (const [entryId, feedback] of this.feedbackData.entries()) {
      const recentFeedback = feedback.filter(f =>
        new Date(f.timestamp) > cutoffDate
      );

      if (recentFeedback.length === 0) {
        this.feedbackData.delete(entryId);
      } else {
        this.feedbackData.set(entryId, recentFeedback);
      }
    }
  }

  /**
   * Destroy knowledge base
   */
  public destroy(): void {
    this.faqs.clear();
    this.entries.clear();
    this.searchIndex.clear();
    this.feedbackData.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load default content
   */
  private loadDefaultContent(): void {
    // Load default FAQs
    DEFAULT_FAQS.forEach(faq => {
      this.faqs.set(faq.id, faq);
    });

    // Load default knowledge entries
    DEFAULT_KNOWLEDGE_ENTRIES.forEach(entry => {
      this.entries.set(entry.id, entry);
    });

    // Load custom content if available
    this.loadCustomContent();
  }

  /**
   * Load custom content from storage
   */
  private async loadCustomContent(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const customData = localStorage.getItem('troubleshooting_knowledge_base');
      if (customData) {
        const data = JSON.parse(customData);
        this.importData(data);
      }
    } catch (error) {
      console.warn('Failed to load custom knowledge base content:', error);
    }
  }

  /**
   * Build search index
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();

    for (const entry of this.entries.values()) {
      this.updateSearchIndex(entry);
    }
  }

  /**
   * Update search index for an entry
   */
  private updateSearchIndex(entry: KnowledgeBaseEntry): void {
    // Remove existing index entries
    this.removeFromSearchIndex(entry.id);

    // Add to search index
    const searchableText = [
      entry.title,
      entry.content,
      ...entry.tags,
      ...entry.searchTerms,
    ].join(' ').toLowerCase();

    const words = searchableText.split(/\s+/).filter(word => word.length > 2);

    for (const word of words) {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(entry.id);
    }
  }

  /**
   * Remove entry from search index
   */
  private removeFromSearchIndex(entryId: string): void {
    for (const [word, entryIds] of this.searchIndex.entries()) {
      entryIds.delete(entryId);
      if (entryIds.size === 0) {
        this.searchIndex.delete(word);
      }
    }
  }

  /**
   * Calculate search score for an entry
   */
  private calculateSearchScore(entry: KnowledgeBaseEntry, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let score = 0;

    for (const word of queryWords) {
      // Check if word is in search index
      if (this.searchIndex.has(word)) {
        const entryIds = this.searchIndex.get(word)!;
        if (entryIds.has(entry.id)) {
          score += 1;
        }
      }

      // Bonus for title matches
      if (entry.title.toLowerCase().includes(word)) {
        score += 2;
      }

      // Bonus for tag matches
      if (entry.tags.some(tag => tag.toLowerCase().includes(word))) {
        score += 1.5;
      }
    }

    // Normalize by query length
    return queryWords.length > 0 ? score / queryWords.length : 0;
  }

  /**
   * Increment version number
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    if (parts.length >= 2) {
      const patch = parseInt(parts[2] || '0') + 1;
      return `${parts[0]}.${parts[1]}.${patch}`;
    }
    return currentVersion;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create knowledge base with default configuration
 */
export function createKnowledgeBase(config?: Partial<TroubleshootingConfig>): KnowledgeBase {
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
  return new KnowledgeBase(finalConfig);
}

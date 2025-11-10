/**
 * Device Context Collector for Mobile Analytics
 *
 * Collects comprehensive device information, capabilities, and context
 * for analytics and optimization purposes.
 *
 * @version 1.0.0
 */

import { MobileDetector } from '../../types/mobile';
import { MobileAnalyticsConfig, DeviceContext, AppContext, NetworkContext, PerformanceContext, BatteryContext, LocationContext, EventContext } from './mobile-analytics';

// ============================================================================
// DEVICE CONTEXT INTERFACES
// ============================================================================

/**
 * Extended device information
 */
export interface ExtendedDeviceInfo {
  // Basic device info
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    manufacturer?: string;
    model?: string;
    brand?: string;
    version?: string;
  };

  // Screen and display
  display: {
    screenResolution: { width: number; height: number };
    viewportSize: { width: number; height: number };
    pixelRatio: number;
    colorDepth: number;
    orientation: 'portrait' | 'landscape';
    screenBrightness?: number; // 0-1 (if available)
    reducedMotion: boolean;
    highContrast: boolean;
  };

  // Hardware capabilities
  hardware: {
    cpuCores: number;
    memoryGB: number;
    gpuVendor?: string;
    gpuRenderer?: string;
    maxTextureSize?: number;
    webglVersion: 1 | 2 | 0; // 0 = not supported
    webgl2Supported: boolean;
    webglSupported: boolean;
    webAssemblySupported: boolean;
    webAudioSupported: boolean;
    mediaDevicesSupported: boolean;
  };

  // Input capabilities
  input: {
    touchSupport: boolean;
    maxTouchPoints: number;
    touchPoints: number;
    pointerSupport: boolean;
    mouseSupport: boolean;
    keyboardSupport: boolean;
    gamepadSupport: boolean;
    stylusSupport: boolean;
    multiTouchSupported: boolean;
    pressureSupport: boolean;
  };

  // Storage capabilities
  storage: {
    localStorageQuota: number; // MB
    localStorageUsage: number; // MB
    sessionStorageQuota: number; // MB
    sessionStorageUsage: number; // MB
    indexedDBQuota: number; // MB
    indexedDBUsage: number; // MB
    cacheQuota: number; // MB
    cacheUsage: number; // MB
    persistentStorage: boolean;
  };

  // Network capabilities
  networkCapabilities: {
    connectionAPI: boolean;
    onlineStatusAPI: boolean;
    serviceWorkerSupport: boolean;
    pushNotificationsSupport: boolean;
    backgroundSyncSupport: boolean;
    webRTCSupport: boolean;
    webSocketsSupport: boolean;
    http2Support: boolean;
    http3Support: boolean;
  };

  // Browser and OS information
  browser: {
    name: string;
    version: string;
    engine: string;
    engineVersion: string;
    platform: string;
    architecture: string;
    language: string;
    languages: string[];
    timezone: string;
    timezoneOffset: number;
    cookieEnabled: boolean;
    doNotTrack: boolean;
  };

  // OS information
  os: {
    name: string;
    version: string;
    platform: string;
    architecture: string;
    bitness: number;
    family: string;
  };

  // Audio capabilities
  audio: {
    webAudioAPI: boolean;
    audioContext: boolean;
    sampleRate: number;
    outputLatency: number;
    maxChannels: number;
    codecs: string[];
    spatialAudio: boolean;
    audioWorklet: boolean;
    mediaRecorder: boolean;
    getUserMedia: boolean;
  };

  // Video capabilities
  video: {
    webGLSupport: boolean;
    webGL2Support: boolean;
    maxTextureSize: number;
    maxRenderBufferSize: number;
    maxViewportDims: { width: number; height: number };
    antialiasing: boolean;
    depthTexture: boolean;
    vertexTextures: boolean;
    maxVertexAttributes: number;
    maxVaryingVectors: number;
    maxFragmentUniformVectors: number;
    maxVertexUniformVectors: number;
    codecs: string[];
  };

  // Sensor capabilities
  sensors: {
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
    ambientLight: boolean;
    proximity: boolean;
    battery: boolean;
    vibration: boolean;
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    deviceOrientation: boolean;
    deviceMotion: boolean;
  };

  // Feature detection
  features: {
    pwaInstallable: boolean;
    standalone: boolean;
    fullscreen: boolean;
    screenOrientation: boolean;
    wakeLock: boolean;
    webShare: boolean;
    webShareTarget: boolean;
    contactPicker: boolean;
    fileSystemAccess: boolean;
    webHID: boolean;
    webSerial: boolean;
    webUSB: boolean;
    webBluetooth: boolean;
    webXR: boolean;
  };

  // Performance capabilities
  performance: {
    performanceAPI: boolean;
    navigationTiming: boolean;
    resourceTiming: boolean;
    userTiming: boolean;
    paintTiming: boolean;
    longTaskTiming: boolean;
    largestContentfulPaint: boolean;
    firstInputDelay: boolean;
    cumulativeLayoutShift: boolean;
    memoryAPI: boolean;
    observerAPI: boolean;
  };

  // Security capabilities
  security: {
    secureContext: boolean;
    mixedContentMode: string;
    crossOriginIsolated: boolean;
    coop: boolean;
    coopReportOnly: boolean;
    csp: boolean;
    subresourceIntegrity: boolean;
    certificateTransparency: boolean;
    hsts: boolean;
    https: boolean;
  };
}

/**
 * App state information
 */
export interface AppState {
  // App metadata
  metadata: {
    version: string;
    buildNumber: string;
    environment: 'development' | 'staging' | 'production';
    deployment: 'web' | 'pwa' | 'mobile';
    framework: string;
    frameworkVersion: string;
  };

  // Current state
  state: {
    page: string;
    route: string;
    referrer: string;
    hash: string;
    search: string;
    title: string;
    language: string;
    direction: 'ltr' | 'rtl';
    theme: string;
    colorScheme: 'light' | 'dark' | 'auto';
  };

  // Viewport and display
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
    zoom: number;
    orientation: 'portrait' | 'landscape';
    devicePixelRatio: number;
    colorGamut: string;
    forcedColors: boolean;
    invertedColors: boolean;
  };

  // Connectivity
  connectivity: {
    online: boolean;
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };

  // User preferences
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    numberFormat: string;
    currency: string;
    reducedMotion: boolean;
    highContrast: boolean;
    fontScale: number;
  };

  // Permissions
  permissions: {
    geolocation: 'granted' | 'denied' | 'prompt';
    camera: 'granted' | 'denied' | 'prompt';
    microphone: 'granted' | 'denied' | 'prompt';
    notifications: 'granted' | 'denied' | 'prompt';
    persistentStorage: 'granted' | 'denied' | 'prompt';
    backgroundSync: 'granted' | 'denied' | 'prompt';
  };
}

/**
 * Network quality metrics
 */
export interface NetworkQualityMetrics {
  // Connection information
  connection: {
    type: string;
    effectiveType: string;
    downlink: number;
    downlinkMax: number;
    rtt: number;
    saveData: boolean;
  };

  // Quality assessment
  quality: {
    speed: 'slow' | 'moderate' | 'fast' | 'very-fast';
    latency: 'low' | 'moderate' | 'high' | 'very-high';
    reliability: 'poor' | 'fair' | 'good' | 'excellent';
    overall: 'poor' | 'fair' | 'good' | 'excellent';
  };

  // Performance metrics
  performance: {
    downloadSpeed: number; // Mbps
    uploadSpeed: number; // Mbps
    latency: number; // ms
    jitter: number; // ms
    packetLoss: number; // percentage
    bandwidthUtilization: number; // percentage
  };

  // Network capabilities
  capabilities: {
    http2: boolean;
    http3: boolean;
    ipv6: boolean;
    tls: string;
    dnsOverHttps: boolean;
    webRTC: boolean;
    webSockets: boolean;
    serviceWorker: boolean;
  };
}

/**
 * Battery and power metrics
 */
export interface BatteryPowerMetrics {
  // Battery information
  battery: {
    level: number; // 0-1
    charging: boolean;
    chargingTime: number; // seconds
    dischargingTime: number; // seconds
    health: 'good' | 'fair' | 'poor' | 'failing';
    age?: number; // months (if available)
    cycles?: number; // charge cycles (if available)
  };

  // Power management
  powerManagement: {
    lowPowerMode: boolean;
    batterySaver: boolean;
    performanceMode: 'normal' | 'high' | 'low';
    thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
    powerSource: 'battery' | 'ac' | 'usb' | 'wireless';
  };

  // Energy consumption
  consumption: {
    current: number; // mA
    voltage: number; // V
    power: number; // W
    energyUsed: number; // Wh
    estimatedRuntime: number; // minutes
  };
}

// ============================================================================
// DEVICE CONTEXT COLLECTOR CLASS
// ============================================================================

/**
 * Collects comprehensive device and context information
 */
export class DeviceContextCollector {
  private config: MobileAnalyticsConfig;
  private extendedDeviceInfo: ExtendedDeviceInfo | null = null;
  private appState: AppState | null = null;
  private lastNetworkQuality: NetworkQualityMetrics | null = null;
  private lastBatteryMetrics: BatteryPowerMetrics | null = null;
  private batteryManager: any = null;
  private networkConnection: any = null;
  private isInitialized = false;

  constructor(config: MobileAnalyticsConfig) {
    this.config = config;
  }

  /**
   * Initialize the context collector
   */
  public async initialize(): Promise<void> {
    if (!this.config.collectDeviceInfo) {
      console.warn('[DeviceContextCollector] Device info collection disabled');
      return;
    }

    try {
      // Collect extended device information
      this.extendedDeviceInfo = await this.collectExtendedDeviceInfo();

      // Collect app state
      this.appState = this.collectAppState();

      // Initialize network monitoring
      await this.initializeNetworkMonitoring();

      // Initialize battery monitoring
      await this.initializeBatteryMonitoring();

      // Set up event listeners for context changes
      this.setupEventListeners();

      this.isInitialized = true;

      if (this.config.debugMode) {
        console.log('[DeviceContextCollector] Initialized successfully');
      }

    } catch (error) {
      console.error('[DeviceContextCollector] Failed to initialize:', error);
    }
  }

  /**
   * Get current context for analytics events
   */
  public async getContext(): Promise<EventContext> {
    if (!this.isInitialized) {
      throw new Error('DeviceContextCollector not initialized');
    }

    try {
      return {
        device: await this.buildDeviceContext(),
        app: this.buildAppContext(),
        network: await this.buildNetworkContext(),
        performance: this.buildPerformanceContext(),
        battery: await this.buildBatteryContext(),
        location: this.config.collectLocation ? await this.buildLocationContext() : undefined,
      };
    } catch (error) {
      console.error('[DeviceContextCollector] Failed to build context:', error);
      throw error;
    }
  }

  /**
   * Get extended device information
   */
  public getExtendedDeviceInfo(): ExtendedDeviceInfo | null {
    return this.extendedDeviceInfo;
  }

  /**
   * Get current app state
   */
  public getAppState(): AppState | null {
    return this.appState;
  }

  /**
   * Get current network quality metrics
   */
  public getNetworkQuality(): NetworkQualityMetrics | null {
    return this.lastNetworkQuality;
  }

  /**
   * Get current battery metrics
   */
  public getBatteryMetrics(): BatteryPowerMetrics | null {
    return this.lastBatteryMetrics;
  }

  /**
   * Refresh all context information
   */
  public async refresh(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Refresh app state
      this.appState = this.collectAppState();

      // Refresh network quality
      this.lastNetworkQuality = await this.collectNetworkQuality();

      // Refresh battery metrics
      this.lastBatteryMetrics = await this.collectBatteryMetrics();

    } catch (error) {
      console.error('[DeviceContextCollector] Failed to refresh context:', error);
    }
  }

  // Private methods
  private async collectExtendedDeviceInfo(): Promise<ExtendedDeviceInfo> {
    const mobileDetector = MobileDetector.getInstance();
    const deviceInfo = mobileDetector.getDeviceInfo();

    return {
      deviceInfo: {
        type: deviceInfo.type,
        manufacturer: this.extractManufacturer(),
        model: this.extractModel(),
        brand: this.extractBrand(),
        version: this.extractDeviceVersion(),
      },
      display: this.collectDisplayInfo(),
      hardware: this.collectHardwareInfo(),
      input: this.collectInputInfo(),
      storage: this.collectStorageInfo(),
      networkCapabilities: this.collectNetworkCapabilities(),
      browser: this.collectBrowserInfo(),
      os: this.collectOSInfo(),
      audio: this.collectAudioCapabilities(),
      video: this.collectVideoCapabilities(),
      sensors: this.collectSensorCapabilities(),
      features: this.collectFeatureCapabilities(),
      performance: this.collectPerformanceCapabilities(),
      security: this.collectSecurityCapabilities(),
    };
  }

  private collectDisplayInfo(): ExtendedDeviceInfo['display'] {
    const screen = window.screen;
    const pixelRatio = window.devicePixelRatio || 1;

    return {
      screenResolution: {
        width: screen.width,
        height: screen.height,
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      pixelRatio,
      colorDepth: screen.colorDepth,
      orientation: screen.width > screen.height ? 'landscape' : 'portrait',
      reducedMotion: this.matchesMediaQuery('(prefers-reduced-motion: reduce)'),
      highContrast: this.matchesMediaQuery('(prefers-contrast: high)'),
    };
  }

  private collectHardwareInfo(): ExtendedDeviceInfo['hardware'] {
    const memory = (performance as any).memory;

    return {
      cpuCores: navigator.hardwareConcurrency || 1,
      memoryGB: memory ? memory.jsHeapSizeLimit / (1024 * 1024 * 1024) : 0,
      gpuVendor: this.getGPUVendor(),
      gpuRenderer: this.getGPURenderer(),
      maxTextureSize: this.getMaxTextureSize(),
      webglVersion: this.getWebGLVersion(),
      webgl2Supported: this.isWebGL2Supported(),
      webglSupported: this.isWebGLSupported(),
      webAssemblySupported: typeof WebAssembly !== 'undefined',
      webAudioSupported: typeof AudioContext !== 'undefined',
      mediaDevicesSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    };
  }

  private collectInputInfo(): ExtendedDeviceInfo['input'] {
    return {
      touchSupport: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 1,
      touchPoints: 0, // Would be updated dynamically
      pointerSupport: 'onpointerdown' in window,
      mouseSupport: 'onmousedown' in window,
      keyboardSupport: 'onkeydown' in window,
      gamepadSupport: 'getGamepads' in navigator,
      stylusSupport: this.detectStylusSupport(),
      multiTouchSupported: navigator.maxTouchPoints > 1,
      pressureSupport: this.detectPressureSupport(),
    };
  }

  private collectStorageInfo(): ExtendedDeviceInfo['storage'] {
    const storage = this.estimateStorage();

    return {
      localStorageQuota: storage.localStorageQuota,
      localStorageUsage: storage.localStorageUsage,
      sessionStorageQuota: storage.sessionStorageQuota,
      sessionStorageUsage: storage.sessionStorageUsage,
      indexedDBQuota: storage.indexedDBQuota,
      indexedDBUsage: storage.indexedDBUsage,
      cacheQuota: storage.cacheQuota,
      cacheUsage: storage.cacheUsage,
      persistentStorage: 'persistentStorage' in navigator && 'persist' in navigator.storage,
    };
  }

  private collectNetworkCapabilities(): ExtendedDeviceInfo['networkCapabilities'] {
    return {
      connectionAPI: !!(navigator as any).connection,
      onlineStatusAPI: 'ononline' in window,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      pushNotificationsSupport: 'PushManager' in window,
      backgroundSyncSupport: 'serviceWorker' in navigator && 'sync' in (window as any).Registration.prototype,
      webRTCSupport: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      webSocketsSupport: 'WebSocket' in window,
      http2Support: this.checkHTTP2Support(),
      http3Support: this.checkHTTP3Support(),
    };
  }

  private collectBrowserInfo(): ExtendedDeviceInfo['browser'] {
    const userAgent = navigator.userAgent;
    const appVersion = navigator.appVersion;

    return {
      name: this.getBrowserName(userAgent),
      version: this.getBrowserVersion(userAgent),
      engine: this.getEngineName(userAgent),
      engineVersion: this.getEngineVersion(userAgent),
      platform: navigator.platform,
      architecture: this.getArchitecture(),
      language: navigator.language,
      languages: Array.from(navigator.languages),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
    };
  }

  private collectOSInfo(): ExtendedDeviceInfo['os'] {
    const userAgent = navigator.userAgent;

    return {
      name: this.getOSName(userAgent),
      version: this.getOSVersion(userAgent),
      platform: navigator.platform,
      architecture: this.getArchitecture(),
      bitness: this.getBitness(),
      family: this.getOSFamily(userAgent),
    };
  }

  private collectAudioCapabilities(): ExtendedDeviceInfo['audio'] {
    const audio = document.createElement('audio');
    const codecs = this.getAudioCodecs(audio);

    return {
      webAudioAPI: typeof AudioContext !== 'undefined',
      audioContext: typeof AudioContext !== 'undefined',
      sampleRate: this.getAudioSampleRate(),
      outputLatency: this.getAudioOutputLatency(),
      maxChannels: this.getMaxAudioChannels(),
      codecs,
      spatialAudio: this.checkSpatialAudioSupport(),
      audioWorklet: 'AudioWorklet' in window,
      mediaRecorder: 'MediaRecorder' in window,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    };
  }

  private collectVideoCapabilities(): ExtendedDeviceInfo['video'] {
    const video = document.createElement('video');
    const codecs = this.getVideoCodecs(video);

    return {
      webGLSupport: this.isWebGLSupported(),
      webGL2Support: this.isWebGL2Supported(),
      maxTextureSize: this.getMaxTextureSize(),
      maxRenderBufferSize: this.getMaxRenderBufferSize(),
      maxViewportDims: this.getMaxViewportDims(),
      antialiasing: this.checkAntialiasingSupport(),
      depthTexture: this.checkDepthTextureSupport(),
      vertexTextures: this.checkVertexTextureSupport(),
      maxVertexAttributes: this.getMaxVertexAttributes(),
      maxVaryingVectors: this.getMaxVaryingVectors(),
      maxFragmentUniformVectors: this.getMaxFragmentUniformVectors(),
      maxVertexUniformVectors: this.getMaxVertexUniformVectors(),
      codecs,
    };
  }

  private collectSensorCapabilities(): ExtendedDeviceInfo['sensors'] {
    return {
      accelerometer: 'DeviceMotionEvent' in window,
      gyroscope: 'DeviceMotionEvent' in window,
      magnetometer: 'DeviceOrientationEvent' in window,
      ambientLight: 'AmbientLightSensor' in window,
      proximity: 'ProximitySensor' in window,
      battery: 'getBattery' in navigator,
      vibration: 'vibrate' in navigator,
      geolocation: 'geolocation' in navigator,
      camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      deviceOrientation: 'DeviceOrientationEvent' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
    };
  }

  private collectFeatureCapabilities(): ExtendedDeviceInfo['features'] {
    return {
      pwaInstallable: this.checkPWAInstallable(),
      standalone: this.checkStandaloneMode(),
      fullscreen: 'fullscreenElement' in document || 'webkitFullscreenElement' in document,
      screenOrientation: 'screen' in window && 'orientation' in window.screen,
      wakeLock: 'wakeLock' in navigator,
      webShare: 'share' in navigator,
      webShareTarget: 'shareTarget' in navigator,
      contactPicker: 'ContactsManager' in window,
      fileSystemAccess: 'showOpenFilePicker' in window,
      webHID: 'hid' in navigator,
      webSerial: 'serial' in navigator,
      webUSB: 'usb' in navigator,
      webBluetooth: 'bluetooth' in navigator,
      webXR: 'xr' in navigator,
    };
  }

  private collectPerformanceCapabilities(): ExtendedDeviceInfo['performance'] {
    return {
      performanceAPI: 'performance' in window,
      navigationTiming: 'getEntriesByType' in performance && 'navigation' in performance.getEntriesByType('navigation')[0],
      resourceTiming: 'getEntriesByType' in performance,
      userTiming: 'mark' in performance && 'measure' in performance,
      paintTiming: 'getEntriesByType' in performance && 'paint' in performance.getEntriesByType('paint')[0],
      longTaskTiming: 'PerformanceObserver' in window && 'longtask' in PerformanceObserver.supportedEntryTypes,
      largestContentfulPaint: 'PerformanceObserver' in window && 'largest-contentful-paint' in PerformanceObserver.supportedEntryTypes,
      firstInputDelay: 'PerformanceObserver' in window && 'first-input' in PerformanceObserver.supportedEntryTypes,
      cumulativeLayoutShift: 'PerformanceObserver' in window && 'layout-shift' in PerformanceObserver.supportedEntryTypes,
      memoryAPI: !!(performance as any).memory,
      observerAPI: 'PerformanceObserver' in window,
    };
  }

  private collectSecurityCapabilities(): ExtendedDeviceInfo['security'] {
    return {
      secureContext: window.isSecureContext,
      mixedContentMode: 'block', // Modern browsers block mixed content
      crossOriginIsolated: window.crossOriginIsolated,
      coop: 'crossOriginIsolated' in window,
      coopReportOnly: false, // Would need to check headers
      csp: this.checkCSPSupport(),
      subresourceIntegrity: this.checkSISupport(),
      certificateTransparency: this.checkCTSupport(),
      hsts: location.protocol === 'https:',
      https: location.protocol === 'https:',
    };
  }

  private collectAppState(): AppState {
    return {
      metadata: {
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || 'unknown',
        environment: (process.env.NODE_ENV as any) || 'development',
        deployment: this.detectDeploymentType(),
        framework: 'Next.js',
        frameworkVersion: process.env.NEXT_PUBLIC_NEXT_VERSION || '15.x',
      },
      state: {
        page: window.location.pathname,
        route: window.location.pathname + window.location.search,
        referrer: document.referrer,
        hash: window.location.hash,
        search: window.location.search,
        title: document.title,
        language: document.documentElement.lang || navigator.language,
        direction: document.documentElement.dir as 'ltr' | 'rtl' || 'ltr',
        theme: this.getCurrentTheme(),
        colorScheme: this.getColorScheme(),
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.pageXOffset,
        scrollY: window.pageYOffset,
        zoom: this.getZoomLevel(),
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        devicePixelRatio: window.devicePixelRatio || 1,
        colorGamut: this.getColorGamut(),
        forcedColors: this.matchesMediaQuery('(forced-colors: active)'),
        invertedColors: this.matchesMediaQuery('(inverted-colors: active)'),
      },
      connectivity: {
        online: navigator.onLine,
        connectionType: this.getConnectionType(),
        effectiveType: this.getEffectiveConnectionType(),
        downlink: this.getDownlink(),
        rtt: this.getRTT(),
        saveData: this.getSaveDataMode(),
      },
      preferences: {
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: Intl.DateTimeFormat().resolvedOptions().dateStyle || 'medium',
        timeFormat: this.getTimeFormat(),
        numberFormat: Intl.NumberFormat().resolvedOptions().style || 'decimal',
        currency: Intl.NumberFormat().resolvedOptions().currency || 'USD',
        reducedMotion: this.matchesMediaQuery('(prefers-reduced-motion: reduce)'),
        highContrast: this.matchesMediaQuery('(prefers-contrast: high)'),
        fontScale: this.getFontScale(),
      },
      permissions: this.getCurrentPermissions(),
    };
  }

  private async collectNetworkQuality(): Promise<NetworkQualityMetrics> {
    const connection = (navigator as any).connection;

    const connectionInfo = {
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 0,
      downlinkMax: connection?.downlinkMax || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    };

    const quality = this.assessNetworkQuality(connectionInfo);

    const performance = {
      downloadSpeed: await this.measureDownloadSpeed(),
      uploadSpeed: await this.measureUploadSpeed(),
      latency: connectionInfo.rtt,
      jitter: await this.measureJitter(),
      packetLoss: 0, // Would need more complex measurement
      bandwidthUtilization: 0, // Would need to measure actual usage
    };

    const capabilities = {
      http2: this.checkHTTP2Support(),
      http3: this.checkHTTP3Support(),
      ipv6: this.checkIPv6Support(),
      tls: this.getTLSVersion(),
      dnsOverHttps: this.checkDNSOverHTTPS(),
      webRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      webSockets: 'WebSocket' in window,
      serviceWorker: 'serviceWorker' in navigator,
    };

    return {
      connection: connectionInfo,
      quality,
      performance,
      capabilities,
    };
  }

  private async collectBatteryMetrics(): Promise<BatteryPowerMetrics> {
    if (!this.batteryManager) {
      return this.getFallbackBatteryMetrics();
    }

    const battery = {
      level: this.batteryManager.level,
      charging: this.batteryManager.charging,
      chargingTime: this.batteryManager.chargingTime,
      dischargingTime: this.batteryManager.dischargingTime,
      health: this.assessBatteryHealth(this.batteryManager),
      age: undefined, // Not available in browsers
      cycles: undefined, // Not available in browsers
    };

    const powerManagement = {
      lowPowerMode: this.getLowPowerMode(),
      batterySaver: this.getBatterySaverMode(),
      performanceMode: this.getPerformanceMode(),
      thermalState: this.getThermalState(),
      powerSource: battery.charging ? 'ac' : 'battery',
    };

    const consumption = {
      current: 0, // Not available in browsers
      voltage: 0, // Not available in browsers
      power: 0, // Not available in browsers
      energyUsed: 0, // Not available in browsers
      estimatedRuntime: battery.dischargingTime / 60, // Convert to minutes
    };

    return {
      battery,
      powerManagement,
      consumption,
    };
  }

  private async buildDeviceContext(): Promise<DeviceContext> {
    if (!this.extendedDeviceInfo) {
      throw new Error('Extended device info not available');
    }

    const deviceInfo = this.extendedDeviceInfo.deviceInfo;
    const display = this.extendedDeviceInfo.display;
    const hardware = this.extendedDeviceInfo.hardware;
    const browser = this.extendedDeviceInfo.browser;
    const os = this.extendedDeviceInfo.os;

    return {
      type: deviceInfo.type,
      manufacturer: deviceInfo.manufacturer,
      model: deviceInfo.model,
      os: `${os.name} ${os.version}`,
      osVersion: os.version,
      browser: browser.name,
      browserVersion: browser.version,
      screenResolution: display.screenResolution,
      pixelRatio: display.pixelRatio,
      orientation: display.orientation,
      touchSupport: this.extendedDeviceInfo.input.touchSupport,
      maxTouchPoints: this.extendedDeviceInfo.input.maxTouchPoints,
      deviceMemory: hardware.memoryGB,
      hardwareConcurrency: hardware.cpuCores,
    };
  }

  private buildAppContext(): AppContext {
    if (!this.appState) {
      throw new Error('App state not available');
    }

    const metadata = this.appState.metadata;
    const state = this.appState.state;
    const viewport = this.appState.viewport;

    return {
      version: metadata.version,
      buildNumber: metadata.buildNumber,
      environment: metadata.environment,
      language: state.language,
      theme: state.theme,
      features: this.getActiveFeatures(),
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      isPWA: metadata.deployment === 'pwa',
      isStandalone: this.extendedDeviceInfo?.features.standalone || false,
      onlineStatus: this.appState.connectivity.online,
    };
  }

  private buildNetworkContext(): NetworkContext {
    if (!this.lastNetworkQuality) {
      return this.getFallbackNetworkContext();
    }

    const connection = this.lastNetworkQuality.connection;
    const quality = this.lastNetworkQuality.quality;

    return {
      type: connection.type as any,
      effectiveType: connection.effectiveType as any,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      connectionQuality: quality.overall as any,
    };
  }

  private buildPerformanceContext(): PerformanceContext {
    const memory = (performance as any).memory;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : undefined,
      cpuUsage: undefined, // Not available in browsers
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : undefined,
      firstContentfulPaint: this.getFirstContentfulPaint(),
      largestContentfulPaint: this.getLargestContentfulPaint(),
      firstInputDelay: this.getFirstInputDelay(),
      cumulativeLayoutShift: this.getCumulativeLayoutShift(),
      frameRate: this.getCurrentFrameRate(),
    };
  }

  private async buildBatteryContext(): Promise<BatteryContext> {
    if (!this.lastBatteryMetrics) {
      return this.getFallbackBatteryContext();
    }

    const battery = this.lastBatteryMetrics.battery;
    const powerManagement = this.lastBatteryMetrics.powerManagement;

    return {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
      isLowPowerMode: powerManagement.lowPowerMode,
    };
  }

  private async buildLocationContext(): Promise<LocationContext> {
    try {
      const position = await this.getCurrentPosition();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      return {
        timezone,
        latitude: position?.latitude,
        longitude: position?.longitude,
      };
    } catch (error) {
      // Geolocation denied or unavailable
      return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
  }

  // Helper methods for device detection
  private extractManufacturer(): string | undefined {
    const userAgent = navigator.userAgent;

    // Common device manufacturers
    if (/Apple/i.test(userAgent)) return 'Apple';
    if (/Samsung/i.test(userAgent)) return 'Samsung';
    if (/Google/i.test(userAgent)) return 'Google';
    if (/Huawei/i.test(userAgent)) return 'Huawei';
    if (/Xiaomi/i.test(userAgent)) return 'Xiaomi';
    if (/OnePlus/i.test(userAgent)) return 'OnePlus';
    if (/LG/i.test(userAgent)) return 'LG';
    if (/Motorola/i.test(userAgent)) return 'Motorola';
    if (/Sony/i.test(userAgent)) return 'Sony';
    if (/HTC/i.test(userAgent)) return 'HTC';
    if (/Nokia/i.test(userAgent)) return 'Nokia';

    return undefined;
  }

  private extractModel(): string | undefined {
    const userAgent = navigator.userAgent;

    // iPhone models
    if (/iPhone/i.test(userAgent)) {
      const match = userAgent.match(/iPhone; CPU iPhone OS (\d+_\d+)/);
      if (match) return `iPhone ${match[1].replace('_', '.')}`;
    }

    // Android models
    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/; ([^)]+)\)/);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractBrand(): string | undefined {
    return this.extractManufacturer(); // Use manufacturer as brand for simplicity
  }

  private extractDeviceVersion(): string | undefined {
    return undefined; // Would need device-specific detection
  }

  private getGPUVendor(): string | undefined {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        return vendor;
      }
    }

    return undefined;
  }

  private getGPURenderer(): string | undefined {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return renderer;
      }
    }

    return undefined;
  }

  private getMaxTextureSize(): number {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    return gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;
  }

  private getWebGLVersion(): 1 | 2 | 0 {
    if (this.isWebGL2Supported()) return 2;
    if (this.isWebGLSupported()) return 1;
    return 0;
  }

  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private isWebGL2Supported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private detectStylusSupport(): boolean {
    return 'onpointerdown' in window && navigator.maxTouchPoints > 0;
  }

  private detectPressureSupport(): boolean {
    return 'PointerEvent' in window && 'pressure' in PointerEvent.prototype;
  }

  private estimateStorage(): ExtendedDeviceInfo['storage'] {
    // Estimate localStorage usage
    let localStorageUsage = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageUsage += localStorage[key].length + key.length;
        }
      }
    } catch {
      // localStorage might be disabled
    }

    // Estimate sessionStorage usage
    let sessionStorageUsage = 0;
    try {
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageUsage += sessionStorage[key].length + key.length;
        }
      }
    } catch {
      // sessionStorage might be disabled
    }

    return {
      localStorageQuota: 10, // 10MB typical quota
      localStorageUsage: localStorageUsage / (1024 * 1024), // Convert to MB
      sessionStorageQuota: 10, // 10MB typical quota
      sessionStorageUsage: sessionStorageUsage / (1024 * 1024), // Convert to MB
      indexedDBQuota: 0, // Would need to check quota API
      indexedDBUsage: 0, // Would need to measure
      cacheQuota: 0, // Would need to check quota API
      cacheUsage: 0, // Would need to measure
      persistentStorage: false, // Would need to check
    };
  }

  private checkHTTP2Support(): boolean {
    return false; // Would need to check via network headers
  }

  private checkHTTP3Support(): boolean {
    return false; // HTTP/3 is not widely detectable from client side
  }

  private getBrowserName(userAgent: string): string {
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Edge/i.test(userAgent)) return 'Edge';
    if (/Opera/i.test(userAgent)) return 'Opera';
    if (/MSIE|Trident/i.test(userAgent)) return 'Internet Explorer';
    return 'Unknown';
  }

  private getBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)\/?(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getEngineName(userAgent: string): string {
    if (/WebKit/i.test(userAgent)) return 'WebKit';
    if (/Gecko/i.test(userAgent)) return 'Gecko';
    if (/Presto/i.test(userAgent)) return 'Presto';
    if (/Trident/i.test(userAgent)) return 'Trident';
    return 'Unknown';
  }

  private getEngineVersion(userAgent: string): string {
    const match = userAgent.match(/(WebKit|Gecko|Presto|Trident)\/?(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getArchitecture(): string {
    return navigator.platform || 'Unknown';
  }

  private getBitness(): number {
    // Try to detect 64-bit vs 32-bit
    if (navigator.userAgent.includes('WOW64') || navigator.userAgent.includes('Win64')) {
      return 64;
    }
    if (navigator.userAgent.includes('x86_64') || navigator.userAgent.includes('x86-64')) {
      return 64;
    }
    return 32; // Default assumption
  }

  private getOSName(userAgent: string): string {
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iOS/i.test(userAgent)) return 'iOS';
    if (/Ubuntu/i.test(userAgent)) return 'Ubuntu';
    if (/CrOS/i.test(userAgent)) return 'Chrome OS';
    return 'Unknown';
  }

  private getOSVersion(userAgent: string): string {
    // Extract OS version - this is simplified
    if (/Windows NT (\d+\.\d+)/.test(userAgent)) {
      return userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] || 'Unknown';
    }
    if (/Mac OS X (\d+[._]\d+)/.test(userAgent)) {
      return userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1].replace('_', '.') || 'Unknown';
    }
    if (/Android (\d+(?:\.\d+)?)/.test(userAgent)) {
      return userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1] || 'Unknown';
    }
    if (/iPhone OS (\d+[._]\d+)/.test(userAgent)) {
      return userAgent.match(/iPhone OS (\d+[._]\d+)/)?.[1].replace('_', '.') || 'Unknown';
    }
    return 'Unknown';
  }

  private getOSFamily(userAgent: string): string {
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iOS/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private getAudioCodecs(audio: HTMLAudioElement): string[] {
    const codecs: string[] = [];

    if (audio.canPlayType('audio/mp4; codecs="mp3"') !== '') codecs.push('mp3');
    if (audio.canPlayType('audio/mp4; codecs="aac"') !== '') codecs.push('aac');
    if (audio.canPlayType('audio/ogg; codecs="vorbis"') !== '') codecs.push('vorbis');
    if (audio.canPlayType('audio/ogg; codecs="opus"') !== '') codecs.push('opus');
    if (audio.canPlayType('audio/wav') !== '') codecs.push('wav');
    if (audio.canPlayType('audio/flac') !== '') codecs.push('flac');

    return codecs;
  }

  private getAudioSampleRate(): number {
    try {
      const audioContext = new AudioContext();
      const sampleRate = audioContext.sampleRate;
      audioContext.close();
      return sampleRate;
    } catch {
      return 44100; // Default
    }
  }

  private getAudioOutputLatency(): number {
    try {
      const audioContext = new AudioContext();
      const latency = audioContext.outputLatency || 0;
      audioContext.close();
      return latency;
    } catch {
      return 0;
    }
  }

  private getMaxAudioChannels(): number {
    try {
      const audioContext = new AudioContext();
      const maxChannels = audioContext.destination.maxChannelCount || 2;
      audioContext.close();
      return maxChannels;
    } catch {
      return 2; // Default stereo
    }
  }

  private checkSpatialAudioSupport(): boolean {
    return 'AudioContext' in window && 'audioWorklet' in AudioContext.prototype;
  }

  private getVideoCodecs(video: HTMLVideoElement): string[] {
    const codecs: string[] = [];

    if (video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '') codecs.push('h264');
    if (video.canPlayType('video/webm; codecs="vp8"') !== '') codecs.push('vp8');
    if (video.canPlayType('video/webm; codecs="vp9"') !== '') codecs.push('vp9');
    if (video.canPlayType('video/webm; codecs="av01"') !== '') codecs.push('av1');

    return codecs;
  }

  private getMaxRenderBufferSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl ? gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) : 0;
    } catch {
      return 0;
    }
  }

  private getMaxViewportDims(): { width: number; height: number } {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        return { width: maxViewportDims[0], height: maxViewportDims[1] };
      }
    } catch {
      // Fall through
    }
    return { width: 0, height: 0 };
  }

  private checkAntialiasingSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getContextAttributes()?.antialias || false : false;
    } catch {
      return false;
    }
  }

  private checkDepthTextureSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? !!gl.getExtension('WEBGL_depth_texture') : false;
    } catch {
      return false;
    }
  }

  private checkVertexTextureSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0 : false;
    } catch {
      return false;
    }
  }

  private getMaxVertexAttributes(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_VERTEX_ATTRIBS) : 0;
    } catch {
      return 0;
    }
  }

  private getMaxVaryingVectors(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_VARYING_VECTORS) : 0;
    } catch {
      return 0;
    }
  }

  private getMaxFragmentUniformVectors(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) : 0;
    } catch {
      return 0;
    }
  }

  private getMaxVertexUniformVectors(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) : 0;
    } catch {
      return 0;
    }
  }

  private checkPWAInstallable(): boolean {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  }

  private checkStandaloneMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone) ||
      document.referrer.includes('android-app://')
    );
  }

  private checkCSPSupport(): boolean {
    return true; // Modern browsers support CSP
  }

  private checkSISupport(): boolean {
    return 'integrity' in document.createElement('script');
  }

  private checkCTSupport(): boolean {
    return false; // Certificate Transparency is not detectable from client side
  }

  private detectDeploymentType(): AppState['metadata']['deployment'] {
    if (this.checkStandaloneMode()) return 'pwa';
    if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
    return 'web';
  }

  private getCurrentTheme(): string {
    return localStorage.getItem('theme') || 'dark';
  }

  private getColorScheme(): AppState['state']['colorScheme'] {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'auto';
  }

  private getZoomLevel(): number {
    return window.outerWidth / window.innerWidth;
  }

  private getColorGamut(): string {
    if (window.matchMedia('(color-gamut: rec2020)').matches) return 'rec2020';
    if (window.matchMedia('(color-gamut: p3)').matches) return 'p3';
    if (window.matchMedia('(color-gamut: srgb)').matches) return 'srgb';
    return 'unknown';
  }

  private matchesMediaQuery(query: string): boolean {
    return window.matchMedia(query).matches;
  }

  private getConnectionType(): string {
    return this.networkConnection?.type || 'unknown';
  }

  private getEffectiveConnectionType(): string {
    return this.networkConnection?.effectiveType || '4g';
  }

  private getDownlink(): number {
    return this.networkConnection?.downlink || 0;
  }

  private getRTT(): number {
    return this.networkConnection?.rtt || 0;
  }

  private getSaveDataMode(): boolean {
    return this.networkConnection?.saveData || false;
  }

  private getTimeFormat(): string {
    const locale = navigator.language;
    const timeFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric' });
    const parts = timeFormatter.formatToParts(new Date());
    const hourPart = parts.find(part => part.type === 'hour');
    return hourPart?.type === 'hour12' ? '12h' : '24h';
  }

  private getFontScale(): number {
    // Try to detect font scaling
    const testElement = document.createElement('div');
    testElement.style.fontSize = '16px';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);

    const computedSize = window.getComputedStyle(testElement).fontSize;
    document.body.removeChild(testElement);

    const fontSize = parseFloat(computedSize);
    return fontSize / 16; // Ratio to default 16px
  }

  private getCurrentPermissions(): AppState['permissions'] {
    // These would need to be requested and checked asynchronously
    return {
      geolocation: 'prompt',
      camera: 'prompt',
      microphone: 'prompt',
      notifications: 'prompt',
      persistentStorage: 'prompt',
      backgroundSync: 'prompt',
    };
  }

  private getActiveFeatures(): string[] {
    const features: string[] = [];

    if (this.extendedDeviceInfo?.features.pwaInstallable) features.push('pwa');
    if (this.extendedDeviceInfo?.features.webShare) features.push('web-share');
    if (this.extendedDeviceInfo?.features.fileSystemAccess) features.push('file-system');
    if (this.extendedDeviceInfo?.sensors.geolocation) features.push('geolocation');
    if (this.extendedDeviceInfo?.sensors.camera) features.push('camera');
    if (this.extendedDeviceInfo?.sensors.microphone) features.push('microphone');

    return features;
  }

  private assessNetworkQuality(connection: NetworkQualityMetrics['connection']): NetworkQualityMetrics['quality'] {
    let speed: NetworkQualityMetrics['quality']['speed'] = 'moderate';
    let latency: NetworkQualityMetrics['quality']['latency'] = 'moderate';
    let reliability: NetworkQualityMetrics['quality']['reliability'] = 'good';

    // Assess speed
    if (connection.downlink > 10) speed = 'very-fast';
    else if (connection.downlink > 5) speed = 'fast';
    else if (connection.downlink > 1) speed = 'moderate';
    else speed = 'slow';

    // Assess latency
    if (connection.rtt < 50) latency = 'low';
    else if (connection.rtt < 150) latency = 'moderate';
    else if (connection.rtt < 300) latency = 'high';
    else latency = 'very-high';

    // Overall quality
    let overall: NetworkQualityMetrics['quality']['overall'] = 'good';
    if (speed === 'slow' || latency === 'very-high') overall = 'poor';
    else if (speed === 'moderate' || latency === 'high') overall = 'fair';
    else if (speed === 'very-fast' && latency === 'low') overall = 'excellent';

    return { speed, latency, reliability, overall };
  }

  private async measureDownloadSpeed(): Promise<number> {
    // Simplified measurement - would download a small test file
    return 0; // Mbps
  }

  private async measureUploadSpeed(): Promise<number> {
    // Simplified measurement - would upload a small test file
    return 0; // Mbps
  }

  private async measureJitter(): Promise<number> {
    // Simplified measurement - would ping multiple times
    return 0; // ms
  }

  private checkIPv6Support(): boolean {
    return false; // Would need more complex detection
  }

  private getTLSVersion(): string {
    return location.protocol === 'https:' ? 'TLS 1.3' : 'None';
  }

  private checkDNSOverHTTPS(): boolean {
    return false; // Not detectable from client side
  }

  private getLowPowerMode(): boolean {
    // iOS specific
    return ('getBatteryInfo' in navigator);
  }

  private getBatterySaverMode(): boolean {
    return false; // Not widely supported
  }

  private getPerformanceMode(): BatteryPowerMetrics['powerManagement']['performanceMode'] {
    // Would detect based on device capabilities and performance
    return 'normal';
  }

  private getThermalState(): BatteryPowerMetrics['powerManagement']['thermalState'] {
    // Not available in most browsers
    return 'nominal';
  }

  private assessBatteryHealth(battery: any): BatteryPowerMetrics['battery']['health'] {
    // Simple assessment based on level and charging behavior
    if (battery.level < 0.3) return 'poor';
    if (battery.level < 0.6) return 'fair';
    return 'good';
  }

  private getFirstContentfulPaint(): number | undefined {
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcp ? fcp.startTime : undefined;
    } catch {
      return undefined;
    }
  }

  private getLargestContentfulPaint(): number | undefined {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        return lastEntry ? lastEntry.startTime : undefined;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      return undefined; // Would be reported asynchronously
    } catch {
      return undefined;
    }
  }

  private getFirstInputDelay(): number | undefined {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const entry = entries[0] as any;
        return entry ? entry.processingStart - entry.startTime : undefined;
      });
      observer.observe({ entryTypes: ['first-input'] });
      return undefined; // Would be reported asynchronously
    } catch {
      return undefined;
    }
  }

  private getCumulativeLayoutShift(): number | undefined {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        return clsValue;
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      return undefined; // Would be reported asynchronously
    } catch {
      return undefined;
    }
  }

  private getCurrentFrameRate(): number {
    // Would need to measure from requestAnimationFrame
    return 60; // Default assumption
  }

  private getFallbackNetworkContext(): NetworkContext {
    return {
      type: 'unknown',
      effectiveType: '4g',
      downlink: 0,
      rtt: 0,
      saveData: false,
      connectionQuality: 'good',
    };
  }

  private getFallbackBatteryMetrics(): BatteryPowerMetrics {
    return {
      battery: {
        level: 1,
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        health: 'good',
      },
      powerManagement: {
        lowPowerMode: false,
        batterySaver: false,
        performanceMode: 'normal',
        thermalState: 'nominal',
        powerSource: 'ac',
      },
      consumption: {
        current: 0,
        voltage: 0,
        power: 0,
        energyUsed: 0,
        estimatedRuntime: Infinity,
      },
    };
  }

  private getFallbackBatteryContext(): BatteryContext {
    return {
      level: 1,
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      isLowPowerMode: false,
    };
  }

  private async getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    this.networkConnection = (navigator as any).connection ||
                            (navigator as any).mozConnection ||
                            (navigator as any).webkitConnection;

    if (this.networkConnection) {
      this.networkConnection.addEventListener('change', () => {
        this.collectNetworkQuality().then(metrics => {
          this.lastNetworkQuality = metrics;
        });
      });
    }
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();

        this.batteryManager.addEventListener('levelchange', () => {
          this.collectBatteryMetrics().then(metrics => {
            this.lastBatteryMetrics = metrics;
          });
        });

        this.batteryManager.addEventListener('chargingchange', () => {
          this.collectBatteryMetrics().then(metrics => {
            this.lastBatteryMetrics = metrics;
          });
        });
      } catch (error) {
        console.warn('[DeviceContextCollector] Battery API not available');
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for screen orientation changes
    window.addEventListener('orientationchange', () => {
      this.refresh();
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.refresh();
    });

    window.addEventListener('offline', () => {
      this.refresh();
    });

    // Listen for viewport changes
    window.addEventListener('resize', () => {
      this.refresh();
    });

    // Listen for language changes
    window.addEventListener('languagechange', () => {
      this.refresh();
    });
  }
}

export default DeviceContextCollector;

#!/usr/bin/env node

/**
 * Vercel Deployment Configuration
 * Optimized configurations for enhanced features deployment
 */

const { DeploymentUtils } = require('../utils/deploy-utils');

class VercelConfig extends DeploymentUtils {
  constructor(options = {}) {
    super(options);
    this.environment = options.environment || process.env.VERCEL_ENV || 'production';
  }

  /**
   * Generate optimized Vercel configuration
   */
  generateVercelConfig() {
    const baseConfig = {
      version: 2,
      name: this.projectName,
      buildCommand: this.getBuildCommand(),
      outputDirectory: '.next',
      installCommand: 'pnpm install --frozen-lockfile',
      devCommand: 'pnpm dev',

      // Framework detection
      framework: 'nextjs',

      // Build environment
      build: {
        env: this.getBuildEnvironment()
      },

      // Headers optimization
      headers: this.getOptimizedHeaders(),

      // Redirects configuration
      redirects: this.getRedirects(),

      // Rewrites for optimization features
      rewrites: this.getRewrites(),

      // Regions for global deployment
      regions: this.getOptimalRegions(),

      // Function configuration
      functions: this.getFunctionConfiguration(),

      // Edge middleware configuration
      middleware: this.getMiddlewareConfig()
    };

    // Environment-specific overrides
    const envSpecificConfig = this.getEnvironmentSpecificConfig();

    return {
      ...baseConfig,
      ...envSpecificConfig
    };
  }

  /**
   * Get optimized build command based on environment
   */
  getBuildCommand() {
    const commands = {
      development: 'pnpm dev',
      preview: 'pnpm build && ANALYZE=true pnpm build:analyze',
      production: 'pnpm build && pnpm run optimize:production'
    };

    return commands[this.environment] || commands.production;
  }

  /**
   * Get build environment variables
   */
  getBuildEnvironment() {
    const baseEnv = {
      NODE_ENV: this.environment === 'development' ? 'development' : 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_DEPLOYMENT_PLATFORM: 'vercel',
      OPTIMIZED_BUILD: 'true',
      PERFORMANCE_MONITORING: this.environment !== 'development' ? 'true' : 'false'
    };

    // Environment-specific variables
    const envSpecific = {
      development: {
        ANALYZE: 'false',
        BUNDLE_ANALYSIS: 'false',
        PERFORMANCE_BUDGET: 'false'
      },
      preview: {
        ANALYZE: 'true',
        BUNDLE_ANALYSIS: 'true',
        PERFORMANCE_BUDGET: 'true',
        PERFORMANCE_MONITORING: 'true'
      },
      production: {
        ANALYZE: 'false',
        BUNDLE_ANALYSIS: 'true',
        PERFORMANCE_BUDGET: 'true',
        PERFORMANCE_MONITORING: 'true',
        MINIFICATION: 'true',
        COMPRESSION: 'true'
      }
    };

    return {
      ...baseEnv,
      ...(envSpecific[this.environment] || envSpecific.production)
    };
  }

  /**
   * Get optimized headers configuration
   */
  getOptimizedHeaders() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=()'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: this.getAllowedOrigins()
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/audio/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400' // 24 hours for audio files
          },
          {
            key: 'Accept-Ranges',
            value: 'bytes'
          }
        ]
      },
      {
        source: '/(.*\\.(webp|avif|png|jpg|jpeg|gif|svg))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable' // 30 days for images
          }
        ]
      },
      {
        // Service worker headers
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      }
    ];
  }

  /**
   * Get allowed origins based on environment
   */
  getAllowedOrigins() {
    const origins = {
      development: 'http://localhost:3000',
      preview: 'https://preview.umuo.app,https://*.vercel.app',
      production: 'https://umuo.app,https://www.umuo.app'
    };

    return origins[this.environment] || origins.production;
  }

  /**
   * Get URL redirects
   */
  getRedirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true
      },
      {
        source: '/app',
        destination: '/',
        permanent: true
      },
      {
        source: '/dashboard',
        destination: '/',
        permanent: true
      },
      // Legacy API redirects
      {
        source: '/api/v1/transcribe',
        destination: '/api/transcribe',
        permanent: true
      },
      {
        source: '/api/v1/upload',
        destination: '/api/upload/chunk',
        permanent: true
      }
    ];
  }

  /**
   * Get URL rewrites for optimization features
   */
  getRewrites() {
    return [
      // API route rewrites for load balancing
      {
        source: '/api/transcribe',
        destination: '/api/transcribe'
      },
      {
        source: '/api/upload/:path*',
        destination: '/api/upload/:path*'
      },
      // Progressive enhancement routes
      {
        source: '/progress/:path*',
        destination: '/api/progress/:path*'
      },
      // Static asset optimization
      {
        source: '/_next/image(.*)',
        destination: '/_next/image$1'
      }
    ];
  }

  /**
   * Get optimal regions for deployment
   */
  getOptimalRegions() {
    return ['hkg1', 'sin1', 'sfo1']; // Hong Kong, Singapore, San Francisco
  }

  /**
   * Get function configuration for optimized serverless functions
   */
  getFunctionConfiguration() {
    return {
      'app/api/transcribe/route.ts': {
        maxDuration: 300, // 5 minutes for transcription
        memory: 1024, // 1GB memory
        runtime: 'nodejs18.x'
      },
      'app/api/upload/chunk/route.ts': {
        maxDuration: 60, // 1 minute for chunk uploads
        memory: 512, // 512MB memory
        runtime: 'nodejs18.x'
      },
      'app/api/postprocess/route.ts': {
        maxDuration: 120, // 2 minutes for post-processing
        memory: 512, // 512MB memory
        runtime: 'nodejs18.x'
      },
      'app/api/progress/[fileId]/route.ts': {
        maxDuration: 30, // 30 seconds for progress tracking
        memory: 256, // 256MB memory
        runtime: 'nodejs18.x'
      },
      // Default configuration for all other functions
      '**': {
        maxDuration: 30,
        memory: 256,
        runtime: 'nodejs18.x'
      }
    };
  }

  /**
   * Get middleware configuration
   */
  getMiddlewareConfig() {
    return {
      // Edge middleware for performance
      edge: true,
      // Regions for edge middleware
      regions: ['hkg1', 'sin1', 'sfo1'],
      // Matched paths
      matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
        // API routes for monitoring and optimization
        '/api/transcribe',
        '/api/upload/:path*',
        '/api/progress/:path*'
      ]
    };
  }

  /**
   * Get environment-specific configurations
   */
  getEnvironmentSpecificConfig() {
    const configs = {
      development: {
        build: {
          env: {
            ANALYZE: 'false',
            PERFORMANCE_MONITORING: 'false'
          }
        }
      },
      preview: {
        build: {
          env: {
            ANALYZE: 'true',
            PERFORMANCE_MONITORING: 'true'
          }
        },
        // Enable analysis features for preview deployments
        alias: [{
          src: '/analyze',
          dest: 'https://analyze.umuo.app'
        }]
      },
      production: {
        build: {
          env: {
            ANALYZE: 'false',
            PERFORMANCE_MONITORING: 'true',
            MINIFICATION: 'true',
            COMPRESSION: 'true'
          }
        },
        // Production optimizations
        alias: [],
        // Custom domains
        domains: ['umuo.app', 'www.umuo.app']
      }
    };

    return configs[this.environment] || configs.production;
  }

  /**
   * Generate environment-specific package.json scripts
   */
  generatePackageScripts() {
    return {
      "build:dev": "NODE_ENV=development pnpm build",
      "build:staging": "NODE_ENV=staging ANALYZE=true pnpm build:analyze",
      "build:prod": "NODE_ENV=production OPTIMIZED_BUILD=true pnpm build",
      "deploy:dev": "vercel --env=development",
      "deploy:staging": "vercel --env=staging",
      "deploy:prod": "vercel --prod",
      "deploy:analyze": "ANALYZE=true vercel --prod",
      "optimize:production": "node scripts/deploy/build/production-optimizer.js",
      "performance:test": "node scripts/performance-test.js --fail-on-error --generate-report",
      "performance:monitor": "node scripts/performance-monitor.js"
    };
  }

  /**
   * Save Vercel configuration to vercel.json
   */
  async saveVercelConfig() {
    const config = this.generateVercelConfig();
    const configPath = path.join(this.options.projectRoot, 'vercel.json');

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.log(`Vercel configuration saved to: ${configPath}`);

    return configPath;
  }

  /**
   * Validate Vercel configuration
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!config.version) {
      errors.push('Missing version field');
    }
    if (!config.buildCommand) {
      errors.push('Missing buildCommand field');
    }
    if (!config.functions) {
      warnings.push('No function configuration specified');
    }

    // Validate function configurations
    if (config.functions) {
      const transcriptionConfig = config.functions['app/api/transcribe/route.ts'];
      if (transcriptionConfig && transcriptionConfig.maxDuration < 300) {
        warnings.push('Transcription function duration should be at least 300 seconds');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Deploy with configuration validation
   */
  async deployWithValidation() {
    this.log('Starting Vercel deployment with validation...');

    // Generate and validate configuration
    const config = this.generateVercelConfig();
    const validation = this.validateConfig(config);

    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        this.log(`Warning: ${warning}`, 'warning');
      });
    }

    // Save configuration
    await this.saveVercelConfig();

    // Run deployment
    const deployCommand = this.environment === 'production'
      ? 'vercel --prod'
      : 'vercel';

    this.log(`Executing deployment command: ${deployCommand}`);

    const result = await this.executeCommand(deployCommand, {
      timeout: 600000 // 10 minutes for deployment
    });

    if (result.exitCode !== 0) {
      throw new Error(`Deployment failed with exit code ${result.exitCode}`);
    }

    this.log('✅ Vercel deployment completed successfully');
    return {
      success: true,
      environment: this.environment,
      validation,
      deployment: result
    };
  }
}

module.exports = { VercelConfig };

#!/usr/bin/env node

/**
 * Deployment Utilities
 * Core utilities for optimized deployment with enhanced features
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class DeploymentUtils {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      ...options
    };

    this.packageJson = this.loadPackageJson();
    this.version = this.packageJson.version;
    this.projectName = this.packageJson.name;
  }

  /**
   * Load package.json configuration
   */
  loadPackageJson() {
    try {
      const packageJsonPath = path.join(this.options.projectRoot, 'package.json');
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to load package.json: ${error.message}`);
    }
  }

  /**
   * Log deployment messages with timestamps
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🐛'
    }[level] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Execute command with error handling and timeout
   */
  async executeCommand(command, options = {}) {
    const {
      timeout = 300000, // 5 minutes default
      cwd = this.options.projectRoot,
      env = process.env,
      silent = false
    } = options;

    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would execute: ${command}`, 'debug');
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    if (!silent && this.options.verbose) {
      this.log(`Executing: ${command}`, 'debug');
    }

    return new Promise((resolve, reject) => {
      const child = spawn(command, [], {
        shell: true,
        cwd,
        env: { ...env, NODE_ENV: process.env.NODE_ENV || 'production' },
        stdio: silent ? 'pipe' : 'inherit'
      });

      let stdout = '';
      let stderr = '';

      if (silent) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Check if deployment is ready (prerequisites)
   */
  async checkDeploymentReadiness() {
    this.log('Checking deployment readiness...');

    const checks = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredNodeVersion = this.packageJson.engines?.node || '>=18.0.0';
    checks.push({
      name: 'Node.js Version',
      status: this.checkVersion(nodeVersion, requiredNodeVersion),
      details: `Current: ${nodeVersion}, Required: ${requiredNodeVersion}`
    });

    // Check package manager
    const requiredPnpmVersion = this.packageJson.engines?.pnpm || '>=8.0.0';
    try {
      const pnpmVersion = await this.executeCommand('pnpm --version', { silent: true });
      checks.push({
        name: 'PNPM Version',
        status: this.checkVersion(`v${pnpmVersion.stdout.trim()}`, requiredPnpmVersion),
        details: `Current: v${pnpmVersion.stdout.trim()}, Required: ${requiredPnpmVersion}`
      });
    } catch (error) {
      checks.push({
        name: 'PNPM Version',
        status: false,
        details: `Failed to check PNPM version: ${error.message}`
      });
    }

    // Check environment variables
    const envChecks = await this.checkEnvironmentVariables();
    checks.push(...envChecks);

    // Check Git status (should be clean for production)
    try {
      const gitStatus = await this.executeCommand('git status --porcelain', { silent: true });
      const isClean = !gitStatus.stdout.trim();
      checks.push({
        name: 'Git Status',
        status: isClean,
        details: isClean ? 'Working directory is clean' : 'Working directory has uncommitted changes'
      });
    } catch (error) {
      checks.push({
        name: 'Git Status',
        status: false,
        details: `Failed to check Git status: ${error.message}`
      });
    }

    // Check for required files
    const requiredFiles = ['package.json', 'next.config.js', 'tsconfig.json'];
    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.join(this.options.projectRoot, file));
      checks.push({
        name: `Required File: ${file}`,
        status: exists,
        details: exists ? `${file} exists` : `${file} is missing`
      });
    }

    const failedChecks = checks.filter(check => !check.status);
    const passedChecks = checks.filter(check => check.status);

    this.log(`Readiness check: ${passedChecks.length}/${checks.length} checks passed`);

    if (failedChecks.length > 0) {
      this.log('Failed checks:', 'warning');
      failedChecks.forEach(check => {
        this.log(`  - ${check.name}: ${check.details}`, 'warning');
      });
    }

    return {
      ready: failedChecks.length === 0,
      checks,
      passedCount: passedChecks.length,
      failedCount: failedChecks.length
    };
  }

  /**
   * Check version constraints
   */
  checkVersion(current, required) {
    // Simple version checking - can be enhanced with semver
    if (required.startsWith('>=')) {
      const requiredVersion = required.slice(2);
      return current.localeCompare(requiredVersion, undefined, { numeric: true }) >= 0;
    }
    return current === required;
  }

  /**
   * Check required environment variables
   */
  async checkEnvironmentVariables() {
    const checks = [];
    const requiredEnvVars = [
      'GROQ_API_KEY'
    ];

    const optionalEnvVars = [
      'NODE_ENV',
      'VERCEL_URL',
      'VERCEL_ENV',
      'ANALYZE',
      'NEXT_PUBLIC_DEPLOYMENT_PLATFORM'
    ];

    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar];
      checks.push({
        name: `Environment Variable: ${envVar}`,
        status: exists,
        details: exists ? `${envVar} is set` : `${envVar} is required but not set`,
        required: true
      });
    }

    for (const envVar of optionalEnvVars) {
      const exists = !!process.env[envVar];
      checks.push({
        name: `Environment Variable: ${envVar}`,
        status: true, // Optional vars don't fail the check
        details: exists ? `${envVar} is set` : `${envVar} is not set (optional)`,
        required: false
      });
    }

    return checks;
  }

  /**
   * Generate deployment metadata
   */
  generateDeploymentMetadata() {
    const metadata = {
      projectName: this.projectName,
      version: this.version,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'production',
      deployment: {
        platform: process.env.NEXT_PUBLIC_DEPLOYMENT_PLATFORM || 'vercel',
        url: process.env.VERCEL_URL || 'localhost',
        environment: process.env.VERCEL_ENV || 'development'
      },
      build: {
        command: 'pnpm build',
        analyzeCommand: 'pnpm build:analyze',
        lintCommand: 'pnpm lint',
        typeCheckCommand: 'pnpm type-check'
      },
      git: {
        // Will be populated if git is available
      }
    };

    // Add Git information if available
    try {
      const gitCommit = this.executeCommand('git rev-parse HEAD', { silent: true });
      const gitBranch = this.executeCommand('git rev-parse --abbrev-ref HEAD', { silent: true });
      const gitRemote = this.executeCommand('git config --get remote.origin.url', { silent: true });

      metadata.git = {
        commit: gitCommit.stdout.trim(),
        branch: gitBranch.stdout.trim(),
        remote: gitRemote.stdout.trim(),
        isClean: !this.executeCommand('git status --porcelain', { silent: true }).stdout.trim()
      };
    } catch (error) {
      metadata.git = { error: 'Git information not available' };
    }

    return metadata;
  }

  /**
   * Save deployment metadata to file
   */
  async saveDeploymentMetadata(outputDir = './deployment-info') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const metadata = this.generateDeploymentMetadata();
    const metadataFile = path.join(outputDir, `deployment-metadata-${Date.now()}.json`);
    const latestFile = path.join(outputDir, 'latest-deployment-metadata.json');

    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    fs.writeFileSync(latestFile, JSON.stringify(metadata, null, 2));

    this.log(`Deployment metadata saved to: ${metadataFile}`);
    return { metadataFile, latestFile, metadata };
  }

  /**
   * Clean up build artifacts and temporary files
   */
  async cleanup() {
    this.log('Cleaning up build artifacts...');

    const cleanupTasks = [
      { path: '.next', description: 'Next.js build output' },
      { path: 'node_modules/.cache', description: 'Node modules cache' },
      { path: 'dist', description: 'Distribution folder' }
    ];

    for (const task of cleanupTasks) {
      const fullPath = path.join(this.options.projectRoot, task.path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          this.log(`Cleaned: ${task.description} (${task.path})`);
        } catch (error) {
          this.log(`Failed to clean ${task.description}: ${error.message}`, 'warning');
        }
      }
    }

    this.log('Cleanup completed');
  }

  /**
   * Create deployment timestamp
   */
  createTimestamp() {
    const now = new Date();
    return {
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      readable: now.toLocaleString(),
      fileSafe: now.toISOString().replace(/[:.]/g, '-')
    };
  }

  /**
   * Validate build output
   */
  async validateBuildOutput(buildDir = '.next') {
    const buildPath = path.join(this.options.projectRoot, buildDir);

    if (!fs.existsSync(buildPath)) {
      return { valid: false, errors: [`Build directory ${buildDir} does not exist`] };
    }

    const validationResults = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {}
    };

    // Check for essential build files
    const requiredFiles = [
      'BUILD_ID',
      'static',
      'server'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(buildPath, file);
      if (!fs.existsSync(filePath)) {
        validationResults.errors.push(`Required build file missing: ${file}`);
        validationResults.valid = false;
      }
    }

    // Check build size
    try {
      const stats = fs.statSync(buildPath);
      validationResults.stats.size = stats.size;
      validationResults.stats.sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    } catch (error) {
      validationResults.warnings.push(`Could not determine build size: ${error.message}`);
    }

    return validationResults;
  }

  /**
   * Get deployment environment configuration
   */
  getEnvironmentConfig(env = process.env.NODE_ENV || 'production') {
    const configs = {
      development: {
        buildCommand: 'pnpm dev',
        apiUrl: 'http://localhost:3000',
        debug: true,
        optimizations: false
      },
      staging: {
        buildCommand: 'pnpm build',
        apiUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://staging.umuo.app',
        debug: true,
        optimizations: true
      },
      production: {
        buildCommand: 'pnpm build',
        apiUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://umuo.app',
        debug: false,
        optimizations: true
      }
    };

    return configs[env] || configs.production;
  }
}

module.exports = { DeploymentUtils };

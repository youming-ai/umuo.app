import http from 'k6/http';
import { check, sleep } from 'k6';
import { chromium } from 'k6/experimental/browser';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 300 }, // Ramp up to 300 users
    { duration: '5m', target: 300 }, // Stay at 300 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
    browser_dom_content_loaded: ['p(95)<2000'],
    browser_first_paint: ['p(95)<1500'],
    browser_loaded: ['p(95)<3000'],
  },
  browser: {
    type: 'chromium',
    headless: true,
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const browser = chromium.launch();
  const context = browser.newContext();
  const page = context.newPage();

  try {
    // Test with different user agents to simulate various browsers
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    page.setUserAgent(randomUserAgent);

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },   // Tablet
      { width: 375, height: 667 },    // Mobile
    ];

    const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
    page.setViewportSize(randomViewport);

    // Test initial page load with stress
    const response = page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const loadSuccess = check(response, {
      'page load successful': (r) => r.status() === 200,
      'page load time < 2s': (r) => r.timing().duration < 2000,
    });

    errorRate.add(!loadSuccess);

    // Stress test theme switching with rapid succession
    const themeButton = page.$('button[aria-label*="切换"]');
    if (themeButton) {
      // Perform 20 rapid theme switches
      for (let i = 0; i < 20; i++) {
        const startTime = new Date().getTime();

        try {
          themeButton.click();

          // Wait for theme change with shorter timeout for stress testing
          page.waitForFunction(
            () => {
              const hasLight = document.documentElement.classList.contains('light');
              const hasDark = document.documentElement.classList.contains('dark');
              return hasLight || hasDark;
            },
            { timeout: 200 }
          );

          const switchTime = new Date().getTime() - startTime;

          check(switchTime, {
            'rapid theme switch < 150ms': (time) => time < 150,
          });

        } catch (e) {
          errorRate.add(1);
          console.error(`Theme switch ${i} failed:`, e.message);
        }

        // Very short pause for stress testing
        sleep(0.05);
      }
    }

    // Stress test with memory pressure
    page.evaluate(() => {
      // Create memory pressure
      const memoryHog = [];
      for (let i = 0; i < 500; i++) {
        memoryHog.push(new Array(1000).fill(Math.random().toString(36)));
      }

      // Create many DOM elements
      const container = document.createElement('div');
      container.className = 'stress-test-container';

      for (let i = 0; i < 500; i++) {
        const element = document.createElement('div');
        element.className = 'card stress-element p-2 mb-1';
        element.innerHTML = `
          <h4 class="text-primary">Stress Element ${i}</h4>
          <p class="text-secondary">Stress testing content ${i}</p>
          <button class="btn-primary btn-small">Stress Button ${i}</button>
        `;
        container.appendChild(element);
      }

      document.body.appendChild(container);
      return { elementCount: container.children.length, memoryHogSize: memoryHog.length };
    });

    // Test theme switching under memory pressure
    const memoryPressureButton = page.$('button[aria-label*="切换"]');
    if (memoryPressureButton) {
      const memoryPressureStartTime = new Date().getTime();

      try {
        memoryPressureButton.click();

        page.waitForFunction(
          () => {
            const hasLight = document.documentElement.classList.contains('light');
            const hasDark = document.documentElement.classList.contains('dark');
            return hasLight || hasDark;
          },
          { timeout: 1000 }
        );

        const memoryPressureSwitchTime = new Date().getTime() - memoryPressureStartTime;

        check(memoryPressureSwitchTime, {
          'theme switch under memory pressure < 500ms': (time) => time < 500,
        });

      } catch (e) {
        errorRate.add(1);
        console.error('Memory pressure theme switch failed:', e.message);
      }
    }

    // Stress test concurrent operations
    page.evaluate(() => {
      const operations = [];

      // Simulate concurrent theme operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const themeButton = document.querySelector('button[aria-label*="切换"]');
              if (themeButton) {
                themeButton.click();
              }
              resolve(i);
            }, Math.random() * 100);
          })
        );
      }

      return Promise.all(operations);
    });

    sleep(0.5);

    // Verify final state is consistent
    const finalStateCheck = page.evaluate(() => {
      const hasLight = document.documentElement.classList.contains('light');
      const hasDark = document.documentElement.classList.contains('dark');
      const themeButton = document.querySelector('button[aria-label*="切换"]');
      const stressElements = document.querySelectorAll('.stress-element');

      return {
        hasValidTheme: hasLight || hasDark,
        hasOnlyOneTheme: !(hasLight && hasDark),
        themeButtonExists: themeButton !== null,
        stressElementCount: stressElements.length,
        isConsistent: (hasLight || hasDark) && themeButton !== null && stressElements.length > 0,
      };
    });

    check(finalStateCheck, {
      'final state consistent': (state) => state.isConsistent,
      'valid theme applied': (state) => state.hasValidTheme,
      'only one theme active': (state) => state.hasOnlyOneTheme,
      'theme button functional': (state) => state.themeButtonExists,
      'stress elements preserved': (state) => state.stressElementCount === 500,
    });

    // Stress test localStorage operations
    page.evaluate(() => {
      const results = [];

      // Perform many localStorage operations
      for (let i = 0; i < 100; i++) {
        try {
          const key = `stress-test-${i}`;
          const value = `stress-value-${i}-${Date.now()}`;
          localStorage.setItem(key, value);

          const retrieved = localStorage.getItem(key);
          const success = retrieved === value;

          results.push({ index: i, success });

          // Clean up
          localStorage.removeItem(key);
        } catch (e) {
          results.push({ index: i, success: false, error: e.message });
        }
      }

      return results;
    });

    // Stress test network conditions (simulate slow network)
    page.route('**/*', (route) => {
      // Simulate network delay for some requests
      if (Math.random() < 0.1) { // 10% of requests
        setTimeout(() => route.continue(), Math.random() * 500);
      } else {
        route.continue();
      }
    });

    // Test theme switching with simulated network issues
    const networkStressButton = page.$('button[aria-label*="切换"]');
    if (networkStressButton) {
      for (let i = 0; i < 5; i++) {
        const networkStressStartTime = new Date().getTime();

        try {
          networkStressButton.click();

          page.waitForFunction(
            () => {
              const hasLight = document.documentElement.classList.contains('light');
              const hasDark = document.documentElement.classList.contains('dark');
              return hasLight || hasDark;
            },
            { timeout: 1500 }
          );

          const networkStressSwitchTime = new Date().getTime() - networkStressStartTime;

          check(networkStressSwitchTime, {
            'theme switch with network stress < 1000ms': (time) => time < 1000,
          });

        } catch (e) {
          errorRate.add(1);
          console.error(`Network stress theme switch ${i} failed:`, e.message);
        }

        sleep(0.1);
      }
    }

    // Cleanup stress test elements
    page.evaluate(() => {
      const container = document.querySelector('.stress-test-container');
      if (container) {
        container.remove();
      }
    });

    sleep(1);

  } catch (error) {
    errorRate.add(1);
    console.error('Stress test error:', error);
  } finally {
    context.close();
    browser.close();
  }
}

export function handleSummary(data) {
  return {
    'theme-stress-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
import http from 'k6/http';
import { check, sleep } from 'k6';
import { chromium } from 'k6/experimental/browser';

export let options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    browser_dom_content_loaded: ['p(95)<1000'],
    browser_first_paint: ['p(95)<800'],
    browser_loaded: ['p(95)<2000'],
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
    // Test initial page load
    const response = page.goto(BASE_URL, { waitUntil: 'networkidle' });

    check(response, {
      'page load successful': (r) => r.status() === 200,
      'page load time < 1s': (r) => r.timing().duration < 1000,
    });

    // Check if theme toggle button is present
    const themeButton = page.$('button[aria-label*="切换"]');
    check(themeButton, {
      'theme toggle button present': (btn) => btn !== null,
    });

    // Test theme switching performance
    if (themeButton) {
      const startTime = new Date().getTime();

      // Click theme toggle button
      themeButton.click();

      // Wait for theme to change
      page.waitForFunction(
        () => document.documentElement.classList.contains('dark'),
        { timeout: 1000 }
      );

      const themeSwitchTime = new Date().getTime() - startTime;

      check(themeSwitchTime, {
        'theme switch time < 100ms': (time) => time < 100,
      });
    }

    // Test multiple rapid theme switches
    for (let i = 0; i < 5; i++) {
      const rapidStartTime = new Date().getTime();

      const button = page.$('button[aria-label*="切换"]');
      if (button) {
        button.click();

        // Wait for theme change
        page.waitForFunction(
          () => {
            const hasLight = document.documentElement.classList.contains('light');
            const hasDark = document.documentElement.classList.contains('dark');
            return hasLight || hasDark;
          },
          { timeout: 500 }
        );

        const rapidSwitchTime = new Date().getTime() - rapidStartTime;

        check(rapidSwitchTime, {
          `rapid theme switch ${i} < 50ms`: (time) => time < 50,
        });
      }

      sleep(0.1); // Brief pause between switches
    }

    // Test theme persistence
    page.reload({ waitUntil: 'networkidle' });

    const persistedTheme = page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    check(persistedTheme, {
      'theme persisted after reload': (theme) => theme === 'dark',
    });

    // Test system theme responsiveness
    page.emulateMedia({ colorScheme: 'light' });
    sleep(1);

    const lightThemeElements = page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      return {
        textPrimary: rootStyles.getPropertyValue('--text-primary'),
        bgPrimary: rootStyles.getPropertyValue('--bg-primary'),
        borderColor: rootStyles.getPropertyValue('--border-primary'),
      };
    });

    check(lightThemeElements.textPrimary, {
      'light theme text color correct': (color) => color.includes('17') || color.includes('24') || color.includes('39'),
    });

    page.emulateMedia({ colorScheme: 'dark' });
    sleep(1);

    const darkThemeElements = page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      return {
        textPrimary: rootStyles.getPropertyValue('--text-primary'),
        bgPrimary: rootStyles.getPropertyValue('--bg-primary'),
        borderColor: rootStyles.getPropertyValue('--border-primary'),
      };
    });

    check(darkThemeElements.textPrimary, {
      'dark theme text color correct': (color) => color.includes('248') || color.includes('250') || color.includes('252'),
    });

    // Test component rendering with different themes
    const componentMetrics = page.evaluate(() => {
      const cards = document.querySelectorAll('.card, .file-card, .settings-card');
      const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');

      return {
        cardCount: cards.length,
        buttonCount: buttons.length,
        hasConsistentStyling: cards.length > 0 && buttons.length > 0,
      };
    });

    check(componentMetrics, {
      'components rendered correctly': (metrics) => metrics.hasConsistentStyling,
      'cards present': (metrics) => metrics.cardCount > 0,
      'buttons present': (metrics) => metrics.buttonCount > 0,
    });

    // Test performance with large content
    page.evaluate(() => {
      // Create large content to test performance
      const container = document.createElement('div');
      container.className = 'performance-test-container';

      for (let i = 0; i < 1000; i++) {
        const card = document.createElement('div');
        card.className = 'card p-4 mb-2';
        card.innerHTML = `
          <h3 class="text-primary">Performance Test Card ${i}</h3>
          <p class="text-secondary">Content for performance testing ${i}</p>
          <button class="btn-primary">Button ${i}</button>
        `;
        container.appendChild(card);
      }

      document.body.appendChild(container);
      return container.children.length;
    });

    const largeContentCount = page.locator('.performance-test-container .card').count();
    check(largeContentCount, {
      'large content created': (count) => count === 1000,
    });

    // Test theme switching with large content
    const largeContentStartTime = new Date().getTime();

    const themeButtonWithLargeContent = page.$('button[aria-label*="切换"]');
    if (themeButtonWithLargeContent) {
      themeButtonWithLargeContent.click();

      page.waitForFunction(
        () => document.documentElement.classList.contains('light'),
        { timeout: 2000 }
      );

      const largeContentSwitchTime = new Date().getTime() - largeContentStartTime;

      check(largeContentSwitchTime, {
        'theme switch with large content < 200ms': (time) => time < 200,
      });
    }

    // Clean up large content
    page.evaluate(() => {
      const container = document.querySelector('.performance-test-container');
      if (container) {
        container.remove();
      }
    });

    sleep(1);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    context.close();
    browser.close();
  }
}

export function handleSummary(data) {
  return {
    'theme-performance-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
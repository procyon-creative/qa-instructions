import { defineConfig } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

const baseURL = fixtureOrigin.url;

// Secrets beyond password fields to keep out of QA Instructions: here, the
// test accounts' email addresses.
export const mask = [/[\w.+-]+@qa\.example\.com/];

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    // The QA Report in test-results/qa-report/ (inside Playwright's default
    // outputDir), with the default presentation of test.step groups:
    // Sections. Markdown is added so its goldens are checked too. It is
    // never opened in a browser, even when a test fails: scripts check this
    // run. playwright.failing.config.ts keeps the default to check that a CI
    // run opens nothing. Runs with other options have their own configs and
    // outputDirs (playwright.variants.config.ts), since a run writes one QA
    // Report.
    [
      '@procyon-creative/qa-instructions/playwright',
      { mask, open: 'never', formats: ['markdown'] },
    ],
  ],
  use: {
    baseURL,
    viewport: { width: 800, height: 600 },
    // Step Screenshots: one screen snapshot per action (Playwright 1.63+).
    // DOM snapshots let the reporter recognize password fields and name
    // elements found by test id or CSS selector.
    trace: { mode: 'on', snapshots: { screen: true, dom: true } },
  },
  webServer: {
    command: 'pnpm --filter @qa-instructions/fixture-site dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

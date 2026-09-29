import { defineConfig } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

const baseURL = fixtureOrigin.url;

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // Only the reporter line: the run writes the QA Report to
    // test-results/qa-report/, inside Playwright's default outputDir.
    // Like the html reporter above, it is never opened in a browser.
    ['@procyon-creative/qa-instructions/playwright', { open: 'never' }],
  ],
  use: {
    baseURL,
    viewport: { width: 800, height: 600 },
  },
  webServer: {
    command: 'pnpm --filter @qa-instructions/fixture-site dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

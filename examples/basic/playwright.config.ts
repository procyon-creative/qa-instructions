import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // Writes the QA Report to test-results/qa-report/, inside Playwright's
    // default outputDir; open it with `pnpm exec qa-instructions show-report`.
    ['@procyon-creative/qa-instructions/playwright', { open: 'never' }],
  ],
});

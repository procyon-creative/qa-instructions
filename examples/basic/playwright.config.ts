import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // Writes the QA Report to qa-report/; open qa-report/index.html.
    ['@procyon-creative/qa-instructions/playwright'],
  ],
});

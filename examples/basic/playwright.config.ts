import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@qa-instructions/playwright/collector', { outputDir: 'qa-runs' }],
  ],
});

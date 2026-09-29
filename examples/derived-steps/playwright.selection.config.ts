import { defineConfig } from '@playwright/test';

import base from './playwright.config';

// Same run as playwright.config.ts, but only tests tagged `@qa` produce
// QA Instructions. Its own outputDir puts its QA Report in
// test-results/selection/qa-report/.
export default defineConfig(base, {
  testMatch: 'selection.spec.ts',
  outputDir: 'test-results/selection',
  reporter: [
    ['list'],
    [
      '@procyon-creative/qa-instructions/playwright',
      {
        open: 'never',
        select: { tags: ['@qa'] },
      },
    ],
  ],
});

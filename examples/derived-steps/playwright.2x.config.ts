import { defineConfig } from '@playwright/test';

import base from './playwright.config';

// The moving-UI test on a high-DPI (2x) screen: Highlights must still line
// up with their elements. Its own outputDir puts its QA Report in
// test-results/2x/qa-report/, apart from the main run's.
export default defineConfig(base, {
  testMatch: 'moving-ui.spec.ts',
  outputDir: 'test-results/2x',
  reporter: [
    ['list'],
    ['@procyon-creative/qa-instructions/playwright', { open: 'never' }],
  ],
  use: { deviceScaleFactor: 2 },
});

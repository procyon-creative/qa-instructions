import { defineConfig } from '@playwright/test';

import base from './playwright.config.ts';

// Tests in ./failing-tests fail on purpose. This run is expected to exit
// non-zero; the e2e `runs` project expects that and e2e/failing-run.spec.ts checks it.
// Its own outputDir puts its QA Report in test-results/failing/qa-report/.
export default defineConfig({
  ...base,
  testDir: './failing-tests',
  outputDir: 'test-results/failing',
  retries: 1,
  expect: { timeout: 1_000 },
  use: { ...base.use, actionTimeout: 1_000 },
  reporter: [
    ['list'],
    ['@procyon-creative/qa-instructions/playwright', { formats: ['markdown'] }],
  ],
});

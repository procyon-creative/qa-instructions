import { defineConfig } from '@playwright/test';

import base from './playwright.config.ts';

// Records the Playwright 1.63 step dumps the adapter's unit tests compare
// with 1.56; run by `pnpm record-fixtures` in examples/derived-steps-1.56.
export default defineConfig({
  ...base,
  testIgnore: 'selection.spec.ts',
  outputDir: 'test-results/record',
  reporter: [
    ['list'],
    [
      '../../packages/qa-instructions/test/playwright/fixtures/steps/step-dump-reporter.ts',
      {
        outputDir:
          '../../packages/qa-instructions/test/playwright/fixtures/steps/1.63',
      },
    ],
  ],
});

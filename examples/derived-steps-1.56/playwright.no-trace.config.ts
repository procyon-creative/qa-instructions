import { defineConfig } from '@playwright/test';

import base from './playwright.config';

// The same run with the trace setting left out, as a developer might forget
// it; scripts/verify-no-trace.mjs checks the reporter still writes QA
// Instructions and warns once with the line to add. Its own outputDir puts
// its QA Report in test-results/no-trace/qa-report/, apart from the main
// run's.
export default defineConfig({
  ...base,
  outputDir: 'test-results/no-trace',
  reporter: [['@procyon-creative/qa-instructions/playwright']],
  use: { ...base.use, trace: 'off' },
});

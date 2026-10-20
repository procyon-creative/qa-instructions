import { defineConfig } from '@playwright/test';

// The verification of this example, itself a Playwright Test run:
// `pnpm e2e`. The `runs` project makes the sample runs (playwright.config.ts
// and playwright.no-trace.config.ts) and the `verify` project checks their
// QA Reports against derived-steps' goldens. This example has no goldens of
// its own to update.
export default defineConfig({
  testDir: './e2e',
  // Apart from the sample runs' test-results/, which they clear.
  outputDir: 'e2e-results',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  projects: [
    { name: 'runs', testMatch: 'runs.setup.ts', timeout: 180_000 },
    { name: 'verify', testMatch: '*.spec.ts', dependencies: ['runs'] },
  ],
});

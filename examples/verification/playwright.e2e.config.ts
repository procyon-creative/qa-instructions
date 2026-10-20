import { defineConfig } from '@playwright/test';

// The verification of this example, itself a Playwright Test run:
// `pnpm e2e`. The `runs` project makes the sample run (playwright.config.ts)
// whose QA Report the `verify` project then checks against ./golden.
// `pnpm e2e --update-snapshots` rewrites the goldens from the run.
export default defineConfig({
  testDir: './e2e',
  // Apart from the sample run's test-results/, which that run clears.
  outputDir: 'e2e-results',
  snapshotDir: './golden',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  projects: [
    { name: 'runs', testMatch: 'runs.setup.ts', timeout: 180_000 },
    { name: 'verify', testMatch: '*.spec.ts', dependencies: ['runs'] },
  ],
});

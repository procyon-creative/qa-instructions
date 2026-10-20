import { defineConfig } from '@playwright/test';

// The verification of this example, itself a Playwright Test run:
// `pnpm e2e`. The `runs` project makes every sample run (the other
// playwright.*.config.ts files) and the `verify` project checks their QA
// Reports against ./golden. `pnpm e2e --update-snapshots` rewrites the
// goldens, text and images, from the runs.
export default defineConfig({
  testDir: './e2e',
  // Apart from the sample runs' test-results/, which they clear.
  outputDir: 'e2e-results',
  snapshotDir: './golden',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  workers: 1,
  // A run's retries are its own (playwright.failing.config.ts).
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  projects: [
    { name: 'runs', testMatch: 'runs.setup.ts', timeout: 180_000 },
    { name: 'verify', testMatch: '*.spec.ts', dependencies: ['runs'] },
  ],
});

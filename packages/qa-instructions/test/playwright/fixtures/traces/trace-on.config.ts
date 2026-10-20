import { defineConfig } from '@playwright/test';

// Records the committed sample traces of plain `trace: 'on'` (no per-action
// screenshots, so Step Screenshots come from the screen recording) on
// Playwright 1.63 and later; see trace-on.spec.ts. Serve the fixture site
// first (`pnpm --filter @qa-instructions/fixture-site dev`). For a version
// other than the repo's, copy this config and the spec into a directory with
// that `@playwright/test` installed, and run it there.
export default defineConfig({
  testDir: '.',
  testMatch: 'trace-on.spec.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 800, height: 600 },
    trace: 'on',
  },
});

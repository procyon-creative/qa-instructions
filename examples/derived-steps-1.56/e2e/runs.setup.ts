import { test, expect } from '@playwright/test';
import { PlaywrightRun } from '@qa-instructions/e2e-kit';

import { SpecSync, root } from '../scripts/spec-sync.ts';
import { runLog } from './shared.ts';

// The sample runs whose QA Reports the verify project checks, on
// Playwright 1.56. A QA Report is written when its run ends, so each is its
// own `playwright test`.

test('the derived-steps tests are copied here to load this Playwright', async () => {
  await new SpecSync().run();
});

test('run the tests with the trace on', async () => {
  const result = await new PlaywrightRun({
    name: 'main',
    cwd: root,
    config: 'playwright.config.ts',
  }).execute();
  await runLog.write(result);
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

// The same tests with the trace setting left out, as a developer might
// forget it.
test('run the tests without the trace setting', async () => {
  const result = await new PlaywrightRun({
    name: 'no-trace',
    cwd: root,
    config: 'playwright.no-trace.config.ts',
  }).execute();
  await runLog.write(result);
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

import path from 'node:path';

import { test, expect } from '@playwright/test';
import { PlaywrightRun } from '@qa-instructions/e2e-kit';

const root = path.join(import.meta.dirname, '..');

test('the sample test runs and writes its QA Report', async () => {
  const result = await new PlaywrightRun({
    name: 'sample',
    cwd: root,
    config: 'playwright.config.ts',
  }).execute();
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { reportOf, root, runLog } from './reports.ts';

// The deliberately failing tests (playwright.failing.config.ts) ran with
// retries as a CI run, with the reporter's default `open` ('on-failure'),
// which would open the QA Report locally since tests fail. Stand-ins for the
// commands a browser is opened with recorded any call (e2e/runs.setup.ts).

// The hint names where the run really wrote the QA Report: inside its
// Playwright outputDir.
const HINT =
  'To open last QA Report run:\n\n  pnpm exec qa-instructions show-report test-results/failing/qa-report\n';
const EXPECTED_BUNDLES = 5;

test('the run failed as expected, yielding one bundle per test', async () => {
  const run = await runLog.read('failing');
  expect(run.status, 'the failing tests exit status').toBe(1);
  const bundles = (
    await readdir(path.join(root, reportOf('failing')), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(bundles, 'one bundle per test, none for skipped tests').toHaveLength(
    EXPECTED_BUNDLES,
  );
});

test('on CI the QA Report stays closed and the run ends with the hint', async () => {
  const run = await runLog.read('failing');
  expect(run.opened, 'browser opened').toEqual([]);
  expect(run.stdout).toContain(HINT);
});

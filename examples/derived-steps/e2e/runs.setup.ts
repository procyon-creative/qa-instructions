import { test, expect } from '@playwright/test';
import { PlaywrightRun, type RunOptions } from '@qa-instructions/e2e-kit';

import { root, runLog } from './reports.ts';
import { VARIANTS } from './variants.ts';

// The sample runs whose QA Reports the verify project checks. A QA Report is
// written when its run ends, so each is its own `playwright test`, one after
// another (they share the fixture site's port and write apart).

interface SampleRun extends Omit<RunOptions, 'cwd'> {
  /** The exit status the run must end with. */
  status: number;
}

const RUNS: SampleRun[] = [
  { name: 'main', config: 'playwright.config.ts', status: 0 },
  // The moving-UI test on a high-DPI screen.
  { name: '2x', config: 'playwright.2x.config.ts', status: 0 },
  ...Object.entries(VARIANTS).map(([name, variant]) => ({
    name: `variant ${name}`,
    config: 'playwright.variants.config.ts',
    env: { ...variant.env, QA_VARIANT: name },
    status: 0,
  })),
  // Tests that fail on purpose, as a CI run: it must open nothing.
  {
    name: 'failing',
    config: 'playwright.failing.config.ts',
    asCi: true,
    status: 1,
  },
  { name: 'selection', config: 'playwright.selection.config.ts', status: 0 },
];

for (const { status, ...options } of RUNS) {
  test(`run ${options.name}`, async () => {
    const result = await new PlaywrightRun({ ...options, cwd: root }).execute();
    await runLog.write(result);
    expect(result.status, result.stdout + result.stderr).toBe(status);
  });
}

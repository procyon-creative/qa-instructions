import { test, expect } from '@playwright/test';

import { GOLDENS, SavedTest, noTraceReport, runLog } from './shared.ts';

// The tests run without the trace setting: QA Instructions are still
// written, text only, and the reporter warns exactly once with the setting
// to add.
const WARNING =
  "no trace was recorded, so QA Instructions have no Step Screenshots. Add this to playwright.config to get them: use: { trace: 'on' }";

test('the reporter warns once, with the trace setting to add', async () => {
  const run = await runLog.read('no-trace');
  const warnings = `${run.stdout}${run.stderr}`
    .split('\n')
    .filter((line) => line.includes(WARNING));
  expect(warnings, 'trace warnings').toHaveLength(1);
});

for (const name of GOLDENS) {
  test(`${name}: QA Instructions are text only`, async () => {
    const saved = new SavedTest(name, noTraceReport);
    const bundle = await saved.bundle();
    expect(bundle.steps.length, 'QA Steps').toBeGreaterThan(0);
    expect(
      bundle.steps.filter((step) => step.assetIds),
      'steps with screenshots',
    ).toEqual([]);
    expect(await saved.assetNames(), 'assets').toEqual([]);
  });
}

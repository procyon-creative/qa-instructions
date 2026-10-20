import { test, expect } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

import { GOLDENS, SavedTest, goldenText } from './shared.ts';

// The derived-steps tests on Playwright 1.56 must read exactly like their
// 1.63 goldens. Those goldens belong to examples/derived-steps, which
// updates them (`pnpm e2e --update-snapshots` there); this example never
// does, so it compares with `toBe`, not a snapshot of its own.
for (const name of GOLDENS) {
  test(`${name} reads like its 1.63 golden`, async () => {
    const actual = fixtureOrigin.canonicalize(await new SavedTest(name).text());
    expect(actual).toBe(await goldenText(name));
  });
}

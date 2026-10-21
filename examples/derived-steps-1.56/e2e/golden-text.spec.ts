import { test, expect } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

import { GOLDENS, SavedTest, goldenText } from './shared.ts';

// The derived-steps tests on Playwright 1.56 must read exactly like their
// 1.63 goldens. Those goldens belong to examples/derived-steps, which
// updates them (`pnpm e2e --update-snapshots` there); this example never
// does, so it compares with `toBe`, not a snapshot of its own.
for (const name of GOLDENS) {
  test(`${name} reads like its 1.63 golden`, async () => {
    test.skip(
      name === 'profile--review-the-account-profile',
      'checked below, but for the array as written',
    );
    const actual = fixtureOrigin.canonicalize(await new SavedTest(name).text());
    expect(actual).toBe(await goldenText(name));
  });
}

// The one sanctioned difference: before 1.63 a check's expected value is
// read from the test's source, and an array is read as it is written there
// (`['Name:', 'Email:']`, brackets and quotes). Read back as the runner
// reported it on 1.63, the text is the same.
test('profile--review-the-account-profile reads like its 1.63 golden, but for the array as written', async () => {
  const name = 'profile--review-the-account-profile';
  const actual = fixtureOrigin
    .canonicalize(await new SavedTest(name).text())
    .replace('[Name:, Email:]', 'Name:, Email:')
    .replace('[Plan:, Region:]', 'Plan:, Region:');
  expect(actual).toBe(await goldenText(name));
});

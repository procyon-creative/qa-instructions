import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { reportOf, root } from './reports.ts';

// playwright.selection.config.ts selects tests tagged `@qa`: only the tagged
// test's bundle may exist, although every test in selection.spec.ts ran.
test('only the tagged test produced a bundle', async () => {
  const bundles = (
    await readdir(path.join(root, reportOf('selection')), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(bundles).toEqual(['selection--open-the-home-page']);
});

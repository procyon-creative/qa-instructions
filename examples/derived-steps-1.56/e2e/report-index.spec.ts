import path from 'node:path';

import { test, expect } from '@playwright/test';
import { ReportIndex } from '@qa-instructions/e2e-kit';

import { GOLDENS, report } from './shared.ts';

// The QA Report's index lists every test, all complete, in directory order,
// and every link leads to a file.
test('the index lists every test, complete, and every link leads to a file', async () => {
  const index = new ReportIndex(report);
  const listed = (await index.rows()).map(
    ({ page, status }) => `${path.dirname(page)} ${status}`,
  );
  expect(listed).toEqual([...GOLDENS].sort().map((name) => `${name} complete`));
  expect(await index.brokenLinks(), 'links to no file').toEqual([]);
});

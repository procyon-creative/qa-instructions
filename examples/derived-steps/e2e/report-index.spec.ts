import path from 'node:path';

import { test, expect } from '@playwright/test';
import { ReportIndex } from '@qa-instructions/e2e-kit';

import { REPORT_FOLDERS, root } from './reports.ts';

// The index of each QA Report lists tests, and every link in it leads to a
// file. (Each index's exact text is a golden too: golden-files.spec.ts.)
for (const folder of REPORT_FOLDERS) {
  test(`${folder}/index.html lists tests, and every link leads to a file`, async () => {
    const index = new ReportIndex(path.join(root, folder));
    expect(await index.rows(), 'tests listed').not.toHaveLength(0);
    expect(await index.brokenLinks(), 'links to no file').toEqual([]);
  });
}

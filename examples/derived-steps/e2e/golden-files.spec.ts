import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { expectStepImages } from './rendered-images.ts';
import { GOLDENS, normalizeRendered, root } from './reports.ts';

// Every QA Report file the runs wrote (Jira text, Markdown, pages, indexes)
// equals its golden in ./golden, and every page or Markdown file shows its
// steps' screenshots.
for (const { rendered, snapshot, bundleDir } of GOLDENS) {
  test(`${rendered} matches golden/${snapshot}`, async () => {
    const content = await readFile(path.join(root, rendered), 'utf8');
    if (bundleDir) await expectStepImages(rendered, bundleDir, content);
    expect(normalizeRendered(rendered, content)).toMatchSnapshot(
      snapshot.split('/'),
    );
  });
}

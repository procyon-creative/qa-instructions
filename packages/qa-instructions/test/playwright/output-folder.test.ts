import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { PlaywrightOutputFolder } from '../../src/playwright/output-folder.js';

// Playwright's HTML reporter resolves `outputFolder` against the config
// file's directory, and its default beside the nearest package.json.

async function withProject(
  body: (project: string) => Promise<void>,
): Promise<void> {
  const project = await mkdtemp(path.join(tmpdir(), 'qa-folder-'));
  try {
    await writeFile(path.join(project, 'package.json'), '{}');
    await mkdir(path.join(project, 'e2e'));
    await body(project);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
}

test('a configured folder is relative to the config file', async () => {
  await withProject(async (project) => {
    const configFile = path.join(project, 'e2e', 'playwright.config.ts');
    assert.equal(
      new PlaywrightOutputFolder('reports/qa').resolve(configFile),
      path.join(project, 'e2e', 'reports', 'qa'),
    );
  });
});

test('an absolute folder is used as is', () => {
  const folder = path.join(tmpdir(), 'somewhere');
  assert.equal(
    new PlaywrightOutputFolder(folder).resolve('/proj/playwright.config.ts'),
    folder,
  );
});

test('the default is qa-report beside the package.json nearest the config', async () => {
  await withProject(async (project) => {
    const configFile = path.join(project, 'e2e', 'playwright.config.ts');
    assert.equal(
      new PlaywrightOutputFolder().resolve(configFile),
      path.join(project, 'qa-report'),
    );
  });
});

test('without a config file, folders are relative to the working directory', () => {
  assert.equal(
    new PlaywrightOutputFolder('out').resolve(undefined),
    path.resolve('out'),
  );
});

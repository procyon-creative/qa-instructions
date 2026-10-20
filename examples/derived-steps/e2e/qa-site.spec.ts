import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

import { reportOf, root } from './reports.ts';
import { QA_SITE } from './variants.ts';
import { readBundle } from './screenshot-specs.ts';

// The qa-site variant ran with QA_SITE set (its page and Jira text are
// goldens, golden-files.spec.ts). Here: its saved data keeps the Test Site
// and the original addresses, and `render --qa-site` retargets a copy.
const TEST = 'sign-in--sign-in-with-bad-credentials';
const folder = path.join(root, reportOf('qa-site'));

// The built command, found from the package's own entry point: CI installs
// before building, so pnpm has no `qa-instructions` bin link to run.
const cli = path.join(
  path.dirname(
    fileURLToPath(import.meta.resolve('@procyon-creative/qa-instructions')),
  ),
  '..',
  'cli',
  'index.js',
);

test('the saved data keeps the Test Site and the original addresses', async () => {
  const bundle = await readBundle(path.join(folder, TEST));
  expect(bundle.meta.testSite).toBe(fixtureOrigin.url);
  expect(bundle.steps[0].action).toBe(`Open ${fixtureOrigin.url}/`);
  expect(bundle.steps[0].url).toBe(`${fixtureOrigin.url}/`);
});

test('render --qa-site retargets a copy of the report', async () => {
  const copy = await mkdtemp(path.join(tmpdir(), 'qa-site-render-'));
  try {
    await cp(folder, path.join(copy, 'qa-report'), { recursive: true });
    const retarget = 'https://another.example.com';
    const render = spawnSync(
      process.execPath,
      [cli, 'render', path.join(copy, 'qa-report'), '--qa-site', retarget],
      { cwd: root, encoding: 'utf8' },
    );
    expect(render.status, render.stderr || render.stdout).toBe(0);
    const text = await readFile(
      path.join(copy, 'qa-report', TEST, 'qa-steps.txt'),
      'utf8',
    );
    expect(text).toMatch(new RegExp(`^1\\. Open ${retarget}/ `));
    expect(text).not.toContain(QA_SITE);
    expect(text).not.toContain(fixtureOrigin.url);
  } finally {
    await rm(copy, { recursive: true, force: true });
  }
});

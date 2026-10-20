import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

import { reportOf, root } from './goldens.mjs';
import { QA_SITE } from './variants.mjs';

// The qa-site variant ran with QA_SITE set (its page and Jira text are
// compared with goldens by verify-run). Here: its saved data keeps the Test
// Site and the original addresses, and `render --qa-site` retargets a copy.

const TEST = 'sign-in--sign-in-with-bad-credentials';
const folder = path.join(root, reportOf('qa-site'));

const bundle = JSON.parse(
  await readFile(path.join(folder, TEST, 'bundle.json'), 'utf8'),
);
assert.equal(bundle.meta.testSite, fixtureOrigin.url);
assert.equal(bundle.steps[0].action, `Open ${fixtureOrigin.url}/`);
assert.equal(bundle.steps[0].url, `${fixtureOrigin.url}/`);

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

const copy = await mkdtemp(path.join(tmpdir(), 'qa-site-render-'));
try {
  await cp(folder, path.join(copy, 'qa-report'), { recursive: true });
  const retarget = 'https://another.example.com';
  const render = spawnSync(
    process.execPath,
    [
      cli,
      'render',
      path.join(copy, 'qa-report'),
      '--qa-site',
      retarget,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(render.status, 0, render.stderr || render.stdout);
  const text = await readFile(
    path.join(copy, 'qa-report', TEST, 'qa-steps.txt'),
    'utf8',
  );
  assert.match(text, new RegExp(`^1\\. Open ${retarget}/ `));
  assert.ok(!text.includes(QA_SITE) && !text.includes(fixtureOrigin.url));
} finally {
  await rm(copy, { recursive: true, force: true });
}
console.log(
  'verify-qa-site: ok (saved data keeps the Test Site; render --qa-site retargets)',
);

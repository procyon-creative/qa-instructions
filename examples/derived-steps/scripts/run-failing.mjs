import { spawnSync } from 'node:child_process';
import {
  chmod,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { root } from './goldens.mjs';

// Runs the deliberately failing tests (with retries) and asserts the run
// fails as expected, yielding one bundle per test that ran despite the
// retries, and none for the skipped tests.
//
// The run is a CI run (`CI=1`) with the reporter's default `open`
// ('on-failure'), which would open the QA Report locally since tests fail. It
// asserts that nothing opens and that the run ends with the hint naming the
// report. Stand-ins for the commands a browser is opened with (`open`,
// `xdg-open`) come first on PATH and record any call.

const bundlesDir = path.join(root, 'qa-report', 'failing');
const expectedBundles = 5;
const HINT =
  'To open last QA Report run:\n\n  pnpm exec qa-instructions show-report qa-report/failing\n';

await rm(bundlesDir, { recursive: true, force: true });

const shims = await mkdtemp(path.join(tmpdir(), 'qa-open-shims-'));
const openLog = path.join(shims, 'opened.log');
for (const command of ['open', 'xdg-open']) {
  const file = path.join(shims, command);
  await writeFile(file, `#!/bin/sh\necho "${command} $*" >> "${openLog}"\n`);
  await chmod(file, 0o755);
}

// Only CI may keep the report closed: not a coding agent running this.
const env = {
  ...process.env,
  CI: '1',
  PATH: `${shims}${path.delimiter}${process.env.PATH}`,
};
delete env.CLAUDECODE;
delete env.COPILOT_CLI;

const run = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '-c', 'playwright.failing.config.ts'],
  { cwd: root, env, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' },
);
process.stdout.write(run.stdout ?? '');
const opened = await readFile(openLog, 'utf8').catch(() => '');
await rm(shims, { recursive: true, force: true });

let failed = false;
function fail(message) {
  console.error(`run-failing: ${message}`);
  failed = true;
}

if (run.status !== 1) {
  fail(`expected the failing tests to exit 1, got ${run.status}`);
}

const bundles = (await readdir(bundlesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
if (bundles.length !== expectedBundles) {
  fail(
    `expected ${expectedBundles} bundles (one per test), got ${bundles.length}: ${bundles.join(', ')}`,
  );
}

if (opened) fail(`the CI run opened the QA Report: ${opened.trim()}`);
if (!run.stdout?.includes(HINT)) {
  fail(`the run did not end with the hint:\n${HINT}`);
}

if (failed) process.exit(1);
console.log(
  `run-failing: ok (failed as expected, ${bundles.length} bundles; on CI the QA Report stayed closed and the hint was printed)`,
);

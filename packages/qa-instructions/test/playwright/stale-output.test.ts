import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type {
  FullConfig,
  FullResult,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import QaInstructionsReporter from '../../src/playwright/index.js';
import { PlaywrightRunCoverage } from '../../src/playwright/run-coverage.js';

const fullRun = ['node', '/proj/node_modules/playwright/cli.js', 'test'];
const config = { version: '1.63.0', shard: null, maxFailures: 0 };

function testCase(title: string): TestCase {
  return {
    id: title,
    title,
    tags: [],
    location: { file: '/proj/tests/sign-in.spec.ts', line: 1, column: 1 },
    parent: { project: () => ({ name: 'chromium', use: {} }) },
  } as unknown as TestCase;
}

async function run(
  out: string,
  title: string,
  argv = fullRun,
  status: FullResult['status'] = 'passed',
): Promise<string[]> {
  const reporter = new QaInstructionsReporter(
    {},
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new PlaywrightRunCoverage(argv),
  );
  reporter.onBegin({
    ...config,
    projects: [{ name: 'chromium', outputDir: path.dirname(out) }],
  } as unknown as FullConfig);
  reporter.onTestEnd(testCase(title), {
    status: 'passed',
    retry: 0,
    attachments: [],
    steps: [],
  } as unknown as TestResult);
  await reporter.onEnd({ status } as FullResult);
  return (await readdir(out)).sort();
}

/** Runs `body` with the QA Report folder inside a temporary Playwright `outputDir`. */
async function withOutput(body: (out: string) => Promise<void>) {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'qa-stale-'));
  try {
    await body(path.join(outputDir, 'qa-report'));
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

test('a full run removes the QA Instructions of a renamed test and keeps files it did not write', async () => {
  await withOutput(async (out) => {
    await run(out, 'Old title');
    await mkdir(path.join(out, 'hand-made'));
    await writeFile(path.join(out, 'notes.txt'), 'mine');

    assert.deepEqual(await run(out, 'New title'), [
      'hand-made',
      'index.html',
      'notes.txt',
      'sign-in--new-title',
    ]);
    const index = await readFile(path.join(out, 'index.html'), 'utf8');
    assert.match(index, /New title/);
    assert.doesNotMatch(index, /Old title/);
  });
});

test('a narrowed or interrupted run keeps earlier QA Instructions', async () => {
  const partialRuns: [string[], FullResult['status']][] = [
    [[...fullRun, '--grep', 'New'], 'passed'],
    [[...fullRun, 'tests/sign-in.spec.ts:12'], 'passed'],
    [[...fullRun, '--project=chromium'], 'passed'],
    [fullRun, 'interrupted'],
  ];
  for (const [argv, status] of partialRuns) {
    await withOutput(async (out) => {
      await run(out, 'Old title');

      assert.deepEqual(await run(out, 'New title', argv, status), [
        'index.html',
        'sign-in--new-title',
        'sign-in--old-title',
      ]);
      // The index lists every test in the folder, kept ones included.
      const index = await readFile(path.join(out, 'index.html'), 'utf8');
      assert.match(index, /New title[\s\S]*Old title/);
    });
  }
});

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { FullConfig, Suite } from '@playwright/test/reporter';

import { PlaywrightOutputFolder } from '../../src/playwright/output-folder.js';

// The QA Report goes in `qa-report/` inside Playwright's tests output folder,
// `outputDir`, which Playwright resolves per project (default
// `test-results/` beside the nearest package.json).

/** A run config whose projects write to the given (resolved) outputDirs. */
function configOf(...outputDirs: string[]): FullConfig {
  return {
    configFile: '/proj/playwright.config.ts',
    projects: outputDirs.map((outputDir, i) => ({ name: `p${i}`, outputDir })),
  } as unknown as FullConfig;
}

/** A root suite holding one project suite per given outputDir, in run order. */
function suiteOf(...outputDirs: string[]): Suite {
  return {
    suites: outputDirs.map((outputDir) => ({
      project: () => ({ outputDir }),
    })),
  } as unknown as Suite;
}

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

test("the QA Report goes in qa-report inside the project's outputDir", () => {
  assert.equal(
    new PlaywrightOutputFolder().forRun(configOf('/proj/test-results')),
    path.join('/proj/test-results', 'qa-report'),
  );
});

test('a configured outputDir moves the QA Report with it', () => {
  assert.equal(
    new PlaywrightOutputFolder().forRun(
      configOf('/proj/artifacts/out'),
      suiteOf('/proj/artifacts/out'),
    ),
    path.join('/proj/artifacts/out', 'qa-report'),
  );
});

test('with projects writing to different outputDirs, the first project in the run decides', () => {
  assert.equal(
    new PlaywrightOutputFolder().forRun(
      configOf('/proj/setup-out', '/proj/chromium-out', '/proj/firefox-out'),
      suiteOf('/proj/chromium-out', '/proj/firefox-out'),
    ),
    path.join('/proj/chromium-out', 'qa-report'),
  );
});

test('with no project in the run, the first configured project decides', () => {
  assert.equal(
    new PlaywrightOutputFolder().forRun(
      configOf('/proj/one', '/proj/two'),
      suiteOf(),
    ),
    path.join('/proj/one', 'qa-report'),
  );
});

test("without a config, the QA Report goes in Playwright's default outputDir beside the nearest package.json", async () => {
  await withProject(async (project) => {
    assert.equal(
      new PlaywrightOutputFolder(path.join(project, 'e2e')).forRun(undefined),
      path.join(project, 'test-results', 'qa-report'),
    );
  });
});

test('show-report finds the default QA Report beside the package.json nearest the working directory', async () => {
  await withProject(async (project) => {
    assert.equal(
      new PlaywrightOutputFolder(path.join(project, 'e2e')).forShowReport(),
      path.join(project, 'test-results', 'qa-report'),
    );
  });
});

test('show-report takes a given folder relative to the working directory', () => {
  assert.equal(
    new PlaywrightOutputFolder('/proj/e2e').forShowReport('out/qa-report'),
    path.join('/proj/e2e', 'out', 'qa-report'),
  );
});

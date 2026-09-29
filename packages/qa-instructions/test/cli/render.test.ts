import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { RenderCommand } from '../../src/cli/render.js';
import {
  QaReport,
  renderQaSteps,
  type QaRunBundle,
} from '../../src/core/index.js';

const BUNDLE: QaRunBundle = {
  version: '1',
  meta: {
    title: 'Open the home page',
    capturedAt: '2026-01-01T00:00:00.000Z',
    status: 'complete',
  },
  steps: [{ index: 1, action: 'Open /', expected: 'The page loads' }],
  assets: {},
};
const TEST = 'home--open-the-home-page';

/**
 * A working directory holding a QA Report in `qa-report/` whose rendered
 * files and index are gone, leaving only each test's saved data.
 */
async function withSavedReport(run: (cwd: string) => Promise<void>) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'qa-render-'));
  try {
    const folder = path.join(cwd, 'qa-report');
    await new QaReport(folder).writeTest(TEST, BUNDLE, [], {});
    for (const file of ['qa-steps.txt', 'qa-steps.html']) {
      await rm(path.join(folder, TEST, file));
    }
    await run(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

function command(cwd: string) {
  const printed: string[] = [];
  const render = new RenderCommand(cwd, (text) => printed.push(text));
  return { render, printed };
}

test('render regenerates the QA Report from its saved data, as a run writes it', async () => {
  await withSavedReport(async (cwd) => {
    const { render, printed } = command(cwd);
    await render.run(['qa-report']);

    const folder = path.join(cwd, 'qa-report');
    assert.equal(
      await readFile(path.join(folder, TEST, 'qa-steps.txt'), 'utf8'),
      renderQaSteps(BUNDLE),
    );
    assert.ok(
      (await readdir(path.join(folder, TEST))).includes('qa-steps.html'),
    );
    assert.match(
      await readFile(path.join(folder, QaReport.INDEX), 'utf8'),
      /href="home--open-the-home-page\/qa-steps.html">Open the home page/,
    );
    assert.deepEqual(printed, [
      `rendered ${path.join(folder, TEST)}`,
      `Wrote the QA Report at ${path.join(folder, QaReport.INDEX)}`,
    ]);
  });
});

test('render writes each --format asked for beside the page and the Jira text', async () => {
  await withSavedReport(async (cwd) => {
    await command(cwd).render.run([
      'qa-report',
      '--format',
      'markdown',
      '--format',
      'json',
    ]);
    const files = (await readdir(path.join(cwd, 'qa-report', TEST))).filter(
      (file) => file.startsWith('qa-steps.'),
    );
    assert.deepEqual(files.sort(), [
      'qa-steps.html',
      'qa-steps.json',
      'qa-steps.md',
      'qa-steps.txt',
    ]);
  });
});

test('render rejects a missing folder, an unknown format, and an unknown option', async () => {
  await withSavedReport(async (cwd) => {
    const { render } = command(cwd);
    await assert.rejects(render.run([]), /Usage: qa-instructions render/);
    await assert.rejects(
      render.run(['qa-report', '--format', 'pdf']),
      /Unknown format "pdf"/,
    );
    await assert.rejects(
      render.run(['qa-report', '--out', 'elsewhere']),
      /Unknown option "--out"/,
    );
  });
});

test('render fails on a folder with no saved test data', async () => {
  await withSavedReport(async (cwd) => {
    await writeFile(path.join(cwd, 'notes.txt'), 'mine');
    await assert.rejects(
      command(cwd).render.run(['.']),
      /No QA Report data found in/,
    );
  });
});

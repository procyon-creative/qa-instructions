import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ShowReportCommand } from '../../src/cli/show-report.js';
import { QaReport, QaReportViewer } from '../../src/core/index.js';

/**
 * A project with a package.json, a `src/` subdirectory, and a QA Report in
 * each of `qa-report/` and `custom/`.
 */
async function withProject(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-show-report-'));
  try {
    await writeFile(path.join(root, 'package.json'), '{}');
    await mkdir(path.join(root, 'src'));
    for (const folder of ['qa-report', 'custom']) {
      await mkdir(path.join(root, folder));
      await writeFile(path.join(root, folder, QaReport.INDEX), '<html>');
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function command(cwd: string) {
  const opened: string[] = [];
  const printed: string[] = [];
  const show = new ShowReportCommand(
    new QaReportViewer(async (file) => {
      opened.push(file);
    }),
    cwd,
    (text) => printed.push(text),
  );
  return { show, opened, printed };
}

test('show-report opens the last QA Report, found beside the nearest package.json', async () => {
  await withProject(async (root) => {
    const { show, opened, printed } = command(path.join(root, 'src'));
    await show.run();
    const index = path.join(root, 'qa-report', QaReport.INDEX);
    assert.deepEqual(opened, [index]);
    assert.deepEqual(printed, [`Opened the QA Report at ${index}`]);
  });
});

test('show-report opens a given folder, relative to the working directory', async () => {
  await withProject(async (root) => {
    const { show, opened } = command(root);
    await show.run('custom');
    assert.deepEqual(opened, [path.join(root, 'custom', QaReport.INDEX)]);
  });
});

test('show-report fails on a folder with no QA Report', async () => {
  await withProject(async (root) => {
    const { show, opened } = command(root);
    await assert.rejects(show.run('missing'), /No QA Report found at/);
    assert.deepEqual(opened, []);
  });
});

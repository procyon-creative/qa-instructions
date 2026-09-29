import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  QaReport,
  QaReportOpener,
  QaReportViewer,
  type QaReportOpenConventions,
} from '../../src/core/index.js';

async function withReport(
  run: (folder: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-open-'));
  try {
    const folder = path.join(root, 'qa-report');
    await mkdir(folder);
    await writeFile(path.join(folder, QaReport.INDEX), '<html></html>');
    await run(folder);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** A viewer that records what it would open instead of opening a browser. */
function recordingViewer(opened: string[]): QaReportViewer {
  return new QaReportViewer(async (target) => {
    opened.push(target);
  });
}

test("the viewer opens the report's index in the browser", async () => {
  await withReport(async (folder) => {
    const opened: string[] = [];
    const viewer = recordingViewer(opened);
    assert.equal(await viewer.show(folder), path.join(folder, QaReport.INDEX));
    assert.deepEqual(opened, [path.join(folder, QaReport.INDEX)]);
  });
});

test('the viewer refuses a folder with no QA Report', async () => {
  const opened: string[] = [];
  await assert.rejects(
    recordingViewer(opened).show(path.join(tmpdir(), 'no-such-qa-report')),
    /No QA Report found at/,
  );
  assert.deepEqual(opened, []);
});

/** Conventions that open when the run failed, recording what they were asked. */
class FakeConventions implements QaReportOpenConventions {
  readonly asked: boolean[] = [];

  shouldOpen(passed: boolean): boolean {
    this.asked.push(passed);
    return !passed;
  }

  hint(folder: string): string {
    return `open ${folder}`;
  }
}

async function finish(
  folder: string,
  passed: boolean,
): Promise<{ opened: string[]; printed: string[]; asked: boolean[] }> {
  const opened: string[] = [];
  const printed: string[] = [];
  const conventions = new FakeConventions();
  await new QaReportOpener(conventions, recordingViewer(opened), (text) =>
    printed.push(text),
  ).afterRun(folder, passed);
  return { opened, printed, asked: conventions.asked };
}

test("after a run, prints the runner's hint and opens the report when its conventions say so", async () => {
  await withReport(async (folder) => {
    const failed = await finish(folder, false);
    assert.deepEqual(failed.asked, [false]);
    assert.deepEqual(failed.opened, [path.join(folder, QaReport.INDEX)]);
    assert.deepEqual(failed.printed, [`open ${folder}`]);

    const passed = await finish(folder, true);
    assert.deepEqual(passed.asked, [true]);
    assert.deepEqual(passed.opened, []);
    assert.deepEqual(passed.printed, [`open ${folder}`]);
  });
});

import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  QaReport,
  renderHtml,
  renderQaSteps,
  EmbeddedImages,
  type QaAssetInput,
  type QaRunBundle,
} from '../../src/core/index.js';
import {
  RENDER_BUNDLE,
  RENDER_BUNDLE_IMAGES,
} from './fixtures/render-bundle.js';

const owner = { file: '/proj/tests/sign-in.spec.ts' };

const COMPLETE: QaRunBundle = {
  version: '1',
  meta: {
    title: 'Open the home page',
    capturedAt: '2026-01-01T00:00:00.000Z',
    status: 'complete',
  },
  steps: [{ index: 1, action: 'Open /', expected: 'The page loads' }],
  assets: {},
};

const ASSETS: QaAssetInput[] = [...RENDER_BUNDLE_IMAGES].map(([id, data]) => ({
  id,
  contentType: 'image/png',
  filename: `${id}.png`,
  data: Buffer.from(data),
}));

async function withFolder(
  body: (folder: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-report-'));
  try {
    await body(path.join(root, 'qa-report'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeBoth(report: QaReport): Promise<void> {
  await report.writeTest('home--open-the-home-page', COMPLETE, [], owner);
  await report.writeTest(
    'sign-in--check-welcome',
    RENDER_BUNDLE,
    ASSETS,
    owner,
  );
}

test('every test gets its saved data, its Jira text, and its page with screenshots', async () => {
  await withFolder(async (folder) => {
    await writeBoth(new QaReport(folder));

    for (const [name, bundle] of [
      ['home--open-the-home-page', COMPLETE],
      ['sign-in--check-welcome', RENDER_BUNDLE],
    ] as const) {
      const dir = path.join(folder, name);
      assert.deepEqual(
        JSON.parse(await readFile(path.join(dir, 'bundle.json'), 'utf8')),
        bundle,
      );
      assert.equal(
        await readFile(path.join(dir, 'qa-steps.txt'), 'utf8'),
        renderQaSteps(bundle),
      );
    }
    assert.equal(
      await readFile(
        path.join(folder, 'sign-in--check-welcome', 'qa-steps.html'),
        'utf8',
      ),
      renderHtml(RENDER_BUNDLE, {
        images: new EmbeddedImages(RENDER_BUNDLE_IMAGES),
      }),
    );
  });
});

test('optional formats are written beside the page and the Jira text', async () => {
  await withFolder(async (folder) => {
    await new QaReport(folder, { formats: ['markdown', 'json'] }).writeTest(
      'home--open-the-home-page',
      COMPLETE,
      [],
      owner,
    );
    const files = (
      await readdir(path.join(folder, 'home--open-the-home-page'))
    ).filter((file) => file.startsWith('qa-steps.'));
    assert.deepEqual(files.sort(), [
      'qa-steps.html',
      'qa-steps.json',
      'qa-steps.md',
      'qa-steps.txt',
    ]);
  });
});

test('the index lists every test in the folder with its status and links', async () => {
  await withFolder(async (folder) => {
    const report = new QaReport(folder);
    await writeBoth(report);

    const index = await report.writeIndex();

    assert.equal(index, path.join(folder, 'index.html'));
    const html = await readFile(index, 'utf8');
    assert.match(
      html,
      /href="home--open-the-home-page\/qa-steps.html">Open the home page<\/a><\/td>\n<td class="status complete">Complete/,
    );
    assert.match(
      html,
      /href="sign-in--check-welcome\/qa-steps.html">Sign in &amp; check &lt;welcome&gt;<\/a><\/td>\n<td class="status incomplete">Incomplete/,
    );
  });
});

test('stale tests are removed before the index is written, and folders the report did not write are ignored', async () => {
  await withFolder(async (folder) => {
    const report = new QaReport(folder);
    await writeBoth(report);
    await writeFile(path.join(folder, 'notes.txt'), 'mine');

    await report.removeStale(new Set(['home--open-the-home-page']), 'complete');
    const html = await readFile(await report.writeIndex(), 'utf8');

    assert.match(html, /Open the home page/);
    assert.doesNotMatch(html, /sign-in--check-welcome/);
    assert.deepEqual((await readdir(folder)).sort(), [
      'home--open-the-home-page',
      'index.html',
      'notes.txt',
    ]);
  });
});

test('an empty run still writes the index', async () => {
  await withFolder(async (folder) => {
    const html = await readFile(
      await new QaReport(folder).writeIndex(),
      'utf8',
    );
    assert.match(html, /No test produced QA Instructions/);
  });
});

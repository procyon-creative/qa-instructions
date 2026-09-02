import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { findBundles, renderAll } from '../src/render.js';

test('findBundles discovers bundle directories', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-cli-'));
  try {
    const bundleDir = path.join(root, 'login--user-can-log-in');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, 'bundle.json'),
      '{"version":"1","meta":{"title":"Login","capturedAt":"2026-01-01T00:00:00.000Z","status":"complete"},"steps":[],"assets":{}}',
    );

    const found = await findBundles(root);
    assert.equal(found.length, 1);
    assert.equal(found[0], bundleDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderAll writes qa-steps files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-cli-'));
  const out = path.join(root, 'out');
  const bundleDir = path.join(root, 'bundle');
  try {
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, 'bundle.json'),
      JSON.stringify({
        version: '1',
        meta: {
          title: 'Login',
          prerequisite: 'Deploy first.',
          capturedAt: '2026-01-01T00:00:00.000Z',
          status: 'complete',
        },
        steps: [{ index: 1, action: 'Open /login', expected: 'Form loads' }],
        assets: {},
      }),
    );

    await renderAll([bundleDir], 'qa-steps', out);
    const text = await readFile(path.join(out, 'bundle.txt'), 'utf8');
    assert.match(text, /Deploy first\./);
    assert.match(text, /1\. Open \/login — Form loads/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

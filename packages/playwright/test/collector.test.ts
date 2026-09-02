import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { TestCase, TestResult } from '@playwright/test/reporter';

import QaCollectorReporter from '../src/reporter/collector.js';

function mockTestCase(): TestCase {
  return {
    title: 'User can log in',
    location: { file: '/proj/tests/login.spec.ts', line: 1, column: 1 },
  } as TestCase;
}

function mockResult(bundle: object, screenshotBodies: Buffer[]): TestResult {
  return {
    status: 'passed',
    retry: 0,
    attachments: [
      {
        name: 'qa-run-bundle',
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify(bundle)),
      },
    ],
    steps: screenshotBodies.map((body) => ({
      title: 'step',
      category: 'test.step',
      attachments: [
        {
          name: 'qa-screenshot',
          contentType: 'image/png',
          body,
        },
      ],
    })),
  } as TestResult;
}

test('collector writes bundle dir from attachments', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'qa-runs-'));
  try {
    const reporter = new QaCollectorReporter({} as never, { outputDir: out });
    const bundle = {
      version: '1',
      meta: {
        title: 'Login',
        capturedAt: new Date().toISOString(),
        status: 'complete',
      },
      steps: [{ index: 1, action: 'Open /login', assetIds: ['step-01-screenshot'] }],
      assets: {
        'step-01-screenshot': {
          id: 'step-01-screenshot',
          contentType: 'image/png',
          filename: 'step-01-screenshot.png',
        },
      },
    };

    await reporter.onTestEnd(
      mockTestCase(),
      mockResult(bundle, [Buffer.from('png-bytes')]),
    );

    const bundlePath = path.join(out, 'login--user-can-log-in', 'bundle.json');
    await stat(bundlePath);
    const raw = await readFile(bundlePath, 'utf8');
    assert.match(raw, /"title": "Login"/);

    const png = await readFile(
      path.join(out, 'login--user-can-log-in', 'assets', 'step-01-screenshot.png'),
    );
    assert.equal(png.toString(), 'png-bytes');
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

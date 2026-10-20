import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';
import {
  fixtureOrigin,
  FixtureOrigin,
} from '@qa-instructions/fixture-site/origin';

/** The test's directory in the QA Report, which is in Playwright's default outputDir. */
const bundleDirName = 'capture--login-error-flow';
const reportDir = path.join(
  import.meta.dirname,
  '..',
  'test-results',
  'qa-report',
);
const inReport = (...parts: string[]) => path.join(reportDir, ...parts);

interface Bundle {
  meta: { capturedAt?: string; source?: { testFile?: string } };
  steps: { url?: string }[];
}

/** Drops run-specific fields (timestamp, absolute path, host) from a bundle. */
function normalizeBundle(bundle: Bundle): Bundle {
  const normalized = structuredClone(bundle);
  delete normalized.meta.capturedAt;
  const source = normalized.meta.source;
  if (source?.testFile) {
    const file = source.testFile.replace(/\\/g, '/');
    const marker = 'examples/verification/tests/';
    const idx = file.indexOf(marker);
    source.testFile = idx >= 0 ? file.slice(idx) : path.basename(file);
  }
  for (const step of normalized.steps) {
    if (step.url) {
      step.url = step.url.replace(
        /^https?:\/\/[^/]+/,
        FixtureOrigin.canonical.url,
      );
    }
  }
  return normalized;
}

/** A file of the report as its golden stores it: on the canonical fixture-site port. */
async function canonicalText(...parts: string[]): Promise<string> {
  return fixtureOrigin.canonicalize(await readFile(inReport(...parts), 'utf8'));
}

test('the saved data matches its golden, once run-specific fields are normalized', async () => {
  const bundle = JSON.parse(await canonicalText(bundleDirName, 'bundle.json'));
  expect(
    `${JSON.stringify(normalizeBundle(bundle), null, 2)}\n`,
  ).toMatchSnapshot('bundle.json');
});

test('the Jira text matches its golden', async () => {
  expect(await canonicalText(bundleDirName, 'qa-steps.txt')).toMatchSnapshot(
    'qa-steps.txt',
  );
});

test('the QA Report index matches its golden, and the test page exists', async () => {
  expect(await canonicalText('index.html')).toMatchSnapshot('index.html');
  await access(inReport(bundleDirName, 'qa-steps.html'));
});

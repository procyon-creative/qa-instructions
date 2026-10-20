// The seam is the built page: `astro build`, then read dist/index.html.
// Expected values come from the repo's README and package.json, not from the
// page source, so the page cannot drift from them unnoticed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const html = read('../dist/index.html');
const readme = read('../../README.md');
const pkg = JSON.parse(read('../../packages/qa-instructions/package.json'));

const ENTITIES = {
  '&#39;': "'",
  '&quot;': '"',
  '&gt;': '>',
  '&lt;': '<',
  '&amp;': '&',
  '&nbsp;': ' ',
};
const pageText = html
  .replace(/<(script|style)\b.*?<\/\1>/gs, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&[a-z#0-9]+;/g, (m) => ENTITIES[m] ?? m)
  .replace(/\s+/g, ' ');

test('install command is the README install command', () => {
  const command = readme.match(/```bash\n(npm install -D \S+)\n```/)?.[1];
  assert.equal(command, 'npm install -D @procyon-creative/qa-instructions');
  assert.ok(pageText.includes(command));
});

test('reporter setup has the README reporter and Playwright 1.63+ trace setting', () => {
  const trace = readme.match(/^\s*(trace: \{ mode: 'on'.*\}),$/m)?.[1];
  assert.ok(trace, 'README has the 1.63+ trace setting');
  assert.ok(pageText.includes(trace));
  assert.ok(pageText.includes("'@procyon-creative/qa-instructions/playwright'"));
});

test('shows the current package version', () => {
  assert.ok(pageText.includes(`v${pkg.version}`));
});

test('names QA Instructions and the QA Report', () => {
  assert.match(pageText, /QA Instructions/);
  assert.match(pageText, /QA Report/);
});

test('links to the README, npm package, and GitHub repo', () => {
  for (const href of [
    'https://github.com/procyon-creative/qa-instructions#readme',
    'https://www.npmjs.com/package/@procyon-creative/qa-instructions',
    'https://github.com/procyon-creative/qa-instructions',
  ]) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
});

test('uses American English and no em dashes', () => {
  assert.doesNotMatch(pageText, /colour|behaviour|organis|centre/i);
  assert.ok(!pageText.includes('—'));
});

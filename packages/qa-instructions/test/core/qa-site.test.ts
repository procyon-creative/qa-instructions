import assert from 'node:assert/strict';
import test from 'node:test';

import { createBundleBuilder } from '../../src/core/bundle/builder.js';
import { render, QaSite } from '../../src/core/index.js';
import type { QaRunBundle } from '../../src/core/model.js';

const TEST_SITE = 'https://shop.lndo.site';

function bundle(testSite: string | undefined = TEST_SITE): QaRunBundle {
  const builder = createBundleBuilder();
  builder.guide({ title: 'Sign in' });
  if (testSite) builder.setTestSite(testSite);
  builder.addStep({
    action: 'Open https://shop.lndo.site/auth/login?next=%2Fcart',
    url: 'https://shop.lndo.site/auth/login?next=%2Fcart',
    expected: 'The page address is **https://shop.lndo.site/auth/login**',
  });
  builder.addStep({
    action: 'Open https://pay.example.com/checkout',
    url: 'https://pay.example.com/checkout',
    expected: 'The page address contains **login-error**',
  });
  builder.addStep({
    action: 'Open https://shop.lndo.site:8443/other',
    url: 'https://shop.lndo.site:8443/other',
  });
  return builder.toBundle();
}

const QA_SITE = QaSite.parse('https://qa-123.example.com');

test('Jira text points Test Site addresses at the QA Site, keeping path and query', () => {
  const text = render(bundle(), 'qa-steps', { qaSite: QA_SITE });

  assert.equal(
    text,
    [
      '1. Open https://qa-123.example.com/auth/login?next=%2Fcart — The page address is **https://qa-123.example.com/auth/login**',
      '2. Open https://pay.example.com/checkout — The page address contains **login-error**',
      '3. Open https://shop.lndo.site:8443/other',
      '',
    ].join('\n'),
  );
});

test('only the Test Site base address matches: other hosts and ports are untouched', () => {
  const text = render(bundle(), 'qa-steps', { qaSite: QA_SITE });
  assert.match(text, /pay\.example\.com\/checkout/);
  assert.match(text, /shop\.lndo\.site:8443\/other/);
});

test('HTML pages link "Open" addresses on the QA Site', () => {
  const html = render(bundle(), 'html', { qaSite: QA_SITE });

  assert.match(
    html,
    /Open <a href="https:\/\/qa-123\.example\.com\/auth\/login\?next=%2Fcart">https:\/\/qa-123\.example\.com\/auth\/login\?next=%2Fcart<\/a>/,
  );
  assert.match(html, /<a href="https:\/\/pay\.example\.com\/checkout">/);
  assert.doesNotMatch(html, /shop\.lndo\.site\/auth/);
});

test('the Jira text keeps addresses plain: no link markup', () => {
  const text = render(bundle(), 'qa-steps', { qaSite: QA_SITE });
  assert.doesNotMatch(text, /<a |\]\(/);
});

test('without a QA Site the HTML page has no links', () => {
  assert.doesNotMatch(render(bundle(), 'html'), /<a /);
});

test('without a QA Site the text is unchanged', () => {
  assert.equal(render(bundle(), 'qa-steps'), render(bundle(), 'qa-steps', {}));
  assert.match(render(bundle(), 'qa-steps'), /shop\.lndo\.site\/auth\/login/);
});

test('a bundle with no recorded Test Site is not rewritten', () => {
  const text = render(bundle(''), 'qa-steps', { qaSite: QA_SITE });
  assert.match(text, /shop\.lndo\.site\/auth\/login/);
});

test('the saved data is never rewritten', () => {
  const saved = bundle();
  const before = JSON.stringify(saved);
  render(saved, 'qa-steps', { qaSite: QA_SITE });
  render(saved, 'html', { qaSite: QA_SITE });
  assert.equal(JSON.stringify(saved), before);
});

test('an explicit default port or an uppercase host still matches the Test Site', () => {
  const builder = createBundleBuilder();
  builder.setTestSite(TEST_SITE);
  builder.addStep({
    action: 'Open https://SHOP.lndo.site:443/x?y=1',
    url: 'https://shop.lndo.site/x?y=1',
  });
  assert.equal(
    render(builder.toBundle(), 'qa-steps', { qaSite: QA_SITE }),
    '1. Open https://qa-123.example.com/x?y=1\n',
  );
});

test('a QA Site with a path prefix keeps the prefix', () => {
  const text = render(bundle(), 'qa-steps', {
    qaSite: QaSite.parse('https://dev.example.com/sandbox/'),
  });
  assert.match(
    text,
    /Open https:\/\/dev\.example\.com\/sandbox\/auth\/login\?next=%2Fcart/,
  );
});

test('QaSite.parse accepts absolute http(s) addresses only', () => {
  assert.ok(QaSite.parse('http://localhost:3000'));
  for (const bad of ['', 'qa.example.com', 'ftp://qa.example.com', '/path']) {
    assert.throws(() => QaSite.parse(bad), /QA Site/);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QaReportIndexHtml,
  QaReportIndexView,
  type QaRunBundle,
} from '../../src/core/index.js';

function bundle(
  title: string,
  status: QaRunBundle['meta']['status'],
): QaRunBundle {
  return {
    version: '1',
    meta: { title, capturedAt: '2026-01-01T00:00:00.000Z', status },
    steps: [{ index: 1, action: 'Open /' }],
    assets: {},
  };
}

const TESTS = [
  {
    name: 'grouped--sign-in-with-good-credentials',
    bundle: bundle('Sign in with good credentials', 'complete'),
  },
  {
    name: 'sign-in--sign-in-shows-the-wrong-user',
    bundle: bundle('Sign in shows the wrong user', 'incomplete'),
  },
];

test('the index lists every test, in order, with its status and links to its page and Jira text', () => {
  const view = QaReportIndexView.from(TESTS);

  assert.deepEqual(view.tests, [
    {
      title: 'Sign in with good credentials',
      status: 'complete',
      statusLabel: 'Complete',
      page: 'grouped--sign-in-with-good-credentials/qa-steps.html',
      text: 'grouped--sign-in-with-good-credentials/qa-steps.txt',
    },
    {
      title: 'Sign in shows the wrong user',
      status: 'incomplete',
      statusLabel: 'Incomplete',
      page: 'sign-in--sign-in-shows-the-wrong-user/qa-steps.html',
      text: 'sign-in--sign-in-shows-the-wrong-user/qa-steps.txt',
    },
  ]);
});

test('the index counts complete and incomplete tests', () => {
  const view = QaReportIndexView.from(TESTS);
  assert.equal(view.summary, '2 tests: 1 complete, 1 incomplete');
  assert.equal(
    QaReportIndexView.from(TESTS.slice(0, 1)).summary,
    '1 test: 1 complete, 0 incomplete',
  );
});

test('index links are URL-encoded directory names', () => {
  const [entry] = QaReportIndexView.from([
    { name: 'a b#c', bundle: bundle('Odd', 'complete') },
  ]).tests;
  assert.equal(entry.page, 'a%20b%23c/qa-steps.html');
});

test('the index page links each test by title and marks its status', () => {
  const html = new QaReportIndexHtml().render(QaReportIndexView.from(TESTS));

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>QA Report<\/title>/);
  assert.match(html, /<h1>QA Report<\/h1>/);
  assert.match(html, /<p>2 tests: 1 complete, 1 incomplete<\/p>/);
  assert.match(
    html,
    /<a href="grouped--sign-in-with-good-credentials\/qa-steps.html">Sign in with good credentials<\/a>/,
  );
  assert.match(
    html,
    /<td class="status complete">Complete<\/td>[\s\S]*<td class="status incomplete">Incomplete<\/td>/,
  );
  assert.match(
    html,
    /<a href="sign-in--sign-in-shows-the-wrong-user\/qa-steps.txt">Jira text<\/a>/,
  );
});

test('the index page loads nothing from the network and escapes titles', () => {
  const html = new QaReportIndexHtml().render(
    QaReportIndexView.from([
      { name: 'x', bundle: bundle('Check <b>&</b>', 'complete') },
    ]),
  );
  assert.match(html, /Content-Security-Policy" content="default-src 'none';/);
  assert.match(html, />Check &lt;b&gt;&amp;&lt;\/b&gt;<\/a>/);
});

test('an empty index says no test produced QA Instructions', () => {
  const html = new QaReportIndexHtml().render(QaReportIndexView.from([]));
  assert.match(html, /<p>No test produced QA Instructions\.<\/p>/);
  assert.doesNotMatch(html, /<table>/);
});

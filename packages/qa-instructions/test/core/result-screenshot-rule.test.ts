import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RESULT_SCREENSHOT_STEPS,
  ResultScreenshotRule,
  type ResultScreenshotOptions,
} from '../../src/core/index.js';

/** What the rule shows for each of four QA Steps, the last one last. */
function shownFor(
  options: ResultScreenshotOptions | undefined,
  actions = ['Open /', 'Click the Sign in link', 'Type demo into Username'],
): string[] {
  const rule = new ResultScreenshotRule(options);
  const all = [...actions, 'Click the Submit button'];
  return all.map((action, i) =>
    rule.screenshots({ action, last: i === all.length - 1 }),
  );
}

test('by default only the last QA Step shows a Result Screenshot, after its Step Screenshot', () => {
  assert.equal(ResultScreenshotRule.DEFAULT, 'last');
  assert.deepEqual(shownFor(undefined), ['action', 'action', 'action', 'both']);
  assert.deepEqual(shownFor({}), ['action', 'action', 'action', 'both']);
});

test('the rule can give every QA Step a Result Screenshot, or none', () => {
  assert.deepEqual(RESULT_SCREENSHOT_STEPS, ['last', 'every', 'none']);
  assert.deepEqual(shownFor('every'), ['both', 'both', 'both', 'both']);
  assert.deepEqual(shownFor({ steps: 'every' }), [
    'both',
    'both',
    'both',
    'both',
  ]);
  assert.deepEqual(shownFor('none'), ['action', 'action', 'action', 'action']);
  assert.deepEqual(shownFor({ steps: 'last' }), [
    'action',
    'action',
    'action',
    'both',
  ]);
});

test('an override matched by step text chooses action, result, or both for that step', () => {
  assert.deepEqual(
    shownFor({
      overrides: [
        { match: 'Sign in', screenshots: 'both' },
        { match: /^Type /, screenshots: 'result' },
        { match: 'Submit', screenshots: 'action' },
      ],
    }),
    ['action', 'both', 'result', 'action'],
  );
});

test('an override applies whatever the rule says for the other steps', () => {
  assert.deepEqual(
    shownFor({
      steps: 'none',
      overrides: [{ match: 'Sign in', screenshots: 'both' }],
    }),
    ['action', 'both', 'action', 'action'],
  );
  assert.deepEqual(
    shownFor({
      steps: 'every',
      overrides: [{ match: 'Open', screenshots: 'action' }],
    }),
    ['action', 'both', 'both', 'both'],
  );
});

test('a string matches anywhere in the step text, case-sensitively; the first matching override wins', () => {
  assert.deepEqual(
    shownFor({
      overrides: [
        { match: 'sign in', screenshots: 'both' },
        { match: 'Username', screenshots: 'result' },
        { match: 'Type', screenshots: 'both' },
      ],
    }),
    ['action', 'action', 'result', 'both'],
  );
});

test('a global or sticky pattern matches every step it should, not every other one', () => {
  const rule = new ResultScreenshotRule({
    steps: 'none',
    overrides: [{ match: /Click/g, screenshots: 'both' }],
  });
  const shown = ['Click A', 'Click B', 'Click C'].map((action) =>
    rule.screenshots({ action, last: false }),
  );
  assert.deepEqual(shown, ['both', 'both', 'both']);
});

test('unknown values are rejected, naming what is wrong', () => {
  const bad: unknown[] = [
    'first',
    { steps: 'all' },
    { overrides: 'Submit' },
    { overrides: [{ match: 'Submit', screenshots: 'after' }] },
    { overrides: [{ match: 3, screenshots: 'both' }] },
    { overrides: [{ screenshots: 'both' }] },
    42,
  ];
  for (const options of bad) {
    assert.throws(
      () => new ResultScreenshotRule(options as ResultScreenshotOptions),
      /resultScreenshots/,
      JSON.stringify(options),
    );
  }
});

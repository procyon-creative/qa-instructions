import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QaInstructionsRecorder,
  renderQaSteps,
  type QaRunBundle,
  type SectionPresentation,
  type TestEvent,
} from '../../src/core/index.js';

const start: TestEvent = {
  type: 'testStart',
  title: 'Review the account',
  runner: 'playwright',
  baseUrl: 'http://127.0.0.1:4321',
};

const groupStart = (title: string): TestEvent => ({
  type: 'groupStart',
  title,
});
const groupEnd = (title: string): TestEvent => ({ type: 'groupEnd', title });
const navigate = (url: string): TestEvent => ({
  type: 'action',
  kind: 'navigate',
  url,
});
const click = (name: string): TestEvent => ({
  type: 'action',
  kind: 'click',
  target: { by: 'role', role: 'button', name },
});
/** The check `expect(card).toContainText(text)` produces. */
const cardContains = (text: string): TestEvent => ({
  type: 'check',
  matcher: 'toContainText',
  negated: false,
  subject: 'element',
  target: { by: 'selector', value: '.card' },
  expected: text,
});

function record(
  sections: SectionPresentation | undefined,
  ...events: TestEvent[]
): QaRunBundle {
  return recordWith(sections, { type: 'testEnd', status: 'passed' }, ...events);
}

function recordWith(
  sections: SectionPresentation | undefined,
  end: TestEvent,
  ...events: TestEvent[]
): QaRunBundle {
  const recorder = new QaInstructionsRecorder(
    sections === undefined ? {} : { sections },
  );
  for (const event of [start, ...events, end]) recorder.handle(event);
  return recorder.toBundle();
}

test('a group of only checks becomes a Section with one "Look at" step', () => {
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/profile'),
        groupStart('Profile card'),
        cardContains('user@example.com'),
        groupEnd('Profile card'),
      ),
    ),
    [
      '1. Open http://127.0.0.1:4321/profile',
      '',
      '### Profile card',
      '2. Look at the **Profile** card — It contains **user@example.com**',
      '',
    ].join('\n'),
  );
});

test('checks of a mixed group stay on the Action step that precedes them', () => {
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/profile'),
        groupStart('Profile card'),
        cardContains('user@example.com'),
        click('Save'),
        groupEnd('Profile card'),
      ),
    ),
    '1. Open http://127.0.0.1:4321/profile — The page contains **user@example.com**\n' +
      '\n' +
      '### Profile card\n' +
      '2. Click the **Save** button\n',
  );
});

test('a check-only group does not change the collapsed presentation', () => {
  assert.equal(
    renderQaSteps(
      record(
        'collapse',
        click('Save'),
        groupStart('Profile card'),
        cardContains('user@example.com'),
        groupEnd('Profile card'),
      ),
    ),
    '1. Click the **Save** button — The page contains **user@example.com**\n',
  );
});

test('a script inside a check-only group does not keep the group from becoming a step', () => {
  // The test checks, reads a value with a script, and checks on. Reading
  // is not an Action, and the warning the script may earn is decided once
  // the run is recorded.
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/profile'),
        groupStart('Profile card'),
        cardContains('user@example.com'),
        { type: 'action', kind: 'script', resultUsed: true },
        {
          type: 'check',
          matcher: 'toBeVisible',
          negated: false,
          subject: 'element',
          target: { by: 'text', value: 'Saved' },
        },
        groupEnd('Profile card'),
      ),
    ),
    '1. Open http://127.0.0.1:4321/profile\n' +
      '\n' +
      '### Profile card\n' +
      '2. Look at the **Profile** card — It contains **user@example.com**; **Saved** is visible\n',
  );
});

test('a check-only group that a warning step falls in keeps its own step first', () => {
  const bundle = record(
    undefined,
    navigate('/profile'),
    groupStart('Profile card'),
    cardContains('user@example.com'),
    {
      type: 'action',
      kind: 'dispatch',
      value: 'click',
      resultUsed: true,
      target: { by: 'text', value: 'Save' },
    },
    {
      type: 'check',
      matcher: 'toBeVisible',
      negated: false,
      subject: 'element',
      target: { by: 'text', value: 'Saved' },
    },
    groupEnd('Profile card'),
  );
  assert.deepEqual(
    bundle.steps.map(({ action, expected, warning }) => ({
      action: action?.slice(0, 40),
      expected,
      warning,
    })),
    [
      {
        action: 'Open http://127.0.0.1:4321/profile',
        expected: undefined,
        warning: undefined,
      },
      {
        action: 'Look at the **Profile** card',
        expected: 'It contains **user@example.com**',
        warning: undefined,
      },
      {
        action: 'The test clicked **Save** with a script inst'.slice(0, 40),
        expected: '**Saved** is visible',
        warning: true,
      },
    ],
  );
});

test('a filtered locator keeps its filter: a count of one reads as what matches', () => {
  // getByRole('definition').filter({ hasText: 'user@example.com' }).toHaveCount(1)
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/profile'),
        cardContains('user@example.com'),
        {
          type: 'check',
          matcher: 'toHaveCount',
          negated: false,
          subject: 'element',
          target: {
            by: 'role',
            role: 'definition',
            hasText: 'user@example.com',
          },
          expected: '1',
        },
      ),
    ),
    '1. Open http://127.0.0.1:4321/profile — The page contains **user@example.com**; one value reads **user@example.com**\n',
  );
});

test('a value check with a message reads the message alone', () => {
  // expect(cartQty, 'cart line-item quantity').toBe(QTY)
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/cart'),
        cardContains('user@example.com'),
        {
          type: 'check',
          matcher: 'toBe',
          negated: false,
          subject: 'value',
          expected: '3',
          description: 'cart line-item quantity',
        },
        {
          type: 'check',
          matcher: 'toBeCloseTo',
          negated: false,
          subject: 'value',
          expected: '714.59375',
          description: 'Value 1 sits level with its label',
        },
      ),
    ),
    '1. Open http://127.0.0.1:4321/cart — The page contains **user@example.com**; cart line-item quantity; value 1 sits level with its label\n',
  );
});

test('a value check without a message is counted as left out, never dropped', () => {
  assert.equal(
    renderQaSteps(
      record(
        undefined,
        navigate('/cart'),
        {
          type: 'check',
          matcher: 'toBe',
          negated: false,
          subject: 'value',
          expected: '0',
        },
        {
          type: 'check',
          matcher: 'toBe',
          negated: false,
          subject: 'value',
          expected: '0',
        },
      ),
    ),
    '1. Open http://127.0.0.1:4321/cart — (2 unworded checks left out)\n',
  );
});

/** The check `expect.soft(value, message).toBeCloseTo(x)` failing produces. */
const softFailed = (description: string): TestEvent => ({
  type: 'check',
  matcher: 'toBeCloseTo',
  negated: false,
  subject: 'value',
  expected: '714.59375',
  description,
  failed: true,
  soft: true,
});

test('every failed soft check on a step is marked, and the header names the steps', () => {
  const softValue = softFailed;
  const bundle = recordWith(
    undefined,
    { type: 'testEnd', status: 'failed' },
    navigate('/profile'),
    groupStart('Profile card'),
    cardContains('user@example.com'),
    softValue('Value 1 sits level with its label'),
    groupEnd('Profile card'),
    groupStart('Details card'),
    cardContains('admin@example.com'),
    softValue('Value 1 sits level with its label'),
    groupEnd('Details card'),
  );
  const rendered = renderQaSteps(bundle);
  assert.ok(
    rendered.endsWith(
      [
        '1. Open http://127.0.0.1:4321/profile',
        '',
        '### Profile card',
        '2. Look at the **Profile** card — It contains **user@example.com**; value 1 sits level with its label (**check failed here**)',
        '',
        '### Details card',
        '3. Look at the **Details** card — It contains **admin@example.com**; value 1 sits level with its label (**check failed here**)',
        '',
      ].join('\n'),
    ),
    rendered,
  );
  assert.equal(bundle.meta.status, 'incomplete');
  assert.match(
    renderQaSteps(bundle),
    /^\*\*Incomplete:\*\* 2 checks failed \(steps 2 and 3\); the test went on, so the later steps are all here\./,
  );
});

test('the header counts every failed check, however many share a step', () => {
  const rendered = renderQaSteps(
    recordWith(
      undefined,
      { type: 'testEnd', status: 'failed' },
      navigate('/profile'),
      groupStart('Profile card'),
      softFailed('Value 1 sits level with its label'),
      softFailed('Value 2 sits level with its label'),
      groupEnd('Profile card'),
    ),
  );
  assert.match(
    rendered,
    /^\*\*Incomplete:\*\* 2 checks failed \(steps 2\); the test went on, so the later steps are all here\./,
  );
  assert.match(
    rendered,
    /value 1 sits level with its label \(\*\*check failed here\*\*\); value 2 sits level with its label \(\*\*check failed here\*\*\)/i,
  );
});

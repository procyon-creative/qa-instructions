import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HighlightPlanner,
  QaInstructionsRecorder,
  ResultScreenshotRule,
  SecretMasker,
  StepScreenshotHighlighter,
  type ActionCapture,
  type ActionEvent,
  type CheckCapture,
  type CheckEvent,
  type Highlight,
  type QaRecording,
  type QaSize,
  type ResultScreenshotOptions,
  type Screenshot,
  type ScreenshotAnnotator,
  type ScreenshotSource,
  type SectionPresentation,
  type StepImage,
  type TestEvent,
} from '../../src/core/index.js';

const shot = (label: string, moment: Screenshot['moment']): Screenshot => ({
  moment,
  contentType: 'image/png',
  data: Buffer.from(`png:${label}`),
});

/** A screenshot source backed by plain maps, keyed by ref. */
class MapScreenshotSource implements ScreenshotSource {
  constructor(
    private readonly captures: Record<string, ActionCapture>,
    private readonly checks: Record<string, CheckCapture> = {},
  ) {}

  capture(ref: string): ActionCapture | undefined {
    return this.captures[ref];
  }

  check(ref: string): CheckCapture | undefined {
    return this.checks[ref];
  }
}

const start: TestEvent = {
  type: 'testStart',
  title: 'Sign in',
  runner: 'playwright',
  file: '/proj/tests/sign-in.spec.ts',
};
const passed: TestEvent = { type: 'testEnd', status: 'passed' };

const open: ActionEvent = {
  type: 'action',
  kind: 'navigate',
  url: 'https://example.com/',
  ref: 'open',
};
const fill: ActionEvent = {
  type: 'action',
  kind: 'fill',
  target: { by: 'label', value: 'Username' },
  value: 'demo',
  ref: 'fill',
};
const submit: ActionEvent = {
  type: 'action',
  kind: 'click',
  target: { by: 'role', role: 'button', name: 'Submit' },
  ref: 'submit',
};
const headingVisible: CheckEvent = {
  type: 'check',
  matcher: 'toBeVisible',
  negated: false,
  subject: 'element',
  target: { by: 'role', role: 'heading', name: 'Login failed' },
  ref: 'heading',
};
const bannerVisible: CheckEvent = {
  type: 'check',
  matcher: 'toBeVisible',
  negated: false,
  subject: 'element',
  target: { by: 'text', value: 'Invalid credentials' },
  ref: 'banner',
};

/** Every Action has a Step Screenshot and a result; every check a result. */
const source = new MapScreenshotSource(
  {
    open: {
      screenshots: [shot('open-after', 'after')],
      result: shot('open-after', 'after'),
    },
    fill: {
      screenshots: [shot('fill-action', 'action')],
      result: shot('fill-after', 'after'),
      box: { x: 10, y: 10, width: 100, height: 20 },
      viewport: { width: 800, height: 600 },
    },
    submit: {
      screenshots: [shot('submit-action', 'action')],
      result: shot('submit-after', 'after'),
      box: { x: 10, y: 50, width: 100, height: 20 },
      point: { x: 60, y: 60 },
      viewport: { width: 800, height: 600 },
    },
  },
  {
    banner: { result: shot('banner-after', 'after') },
    heading: { result: shot('heading-after', 'after') },
  },
);

function record(
  events: TestEvent[],
  options: {
    resultScreenshots?: ResultScreenshotOptions;
    sections?: SectionPresentation;
    from?: ScreenshotSource;
  } = {},
): QaRecording {
  const recorder = new QaInstructionsRecorder({
    sections: options.sections,
    resultScreenshots: new ResultScreenshotRule(options.resultScreenshots),
  });
  for (const event of [start, ...events, passed]) recorder.handle(event);
  return recorder.toRecording(options.from ?? source);
}

/** Each step's images as `[Step Screenshot, Result Screenshot]` contents. */
function images({ bundle, assets }: QaRecording): (string | undefined)[][] {
  const data = new Map(assets.map((a) => [a.id, a.data.toString()]));
  return bundle.steps.map((step) => [
    step.assetIds?.[0] && data.get(step.assetIds[0]),
    step.resultAssetId && data.get(step.resultAssetId),
  ]);
}

const signIn: TestEvent[] = [open, fill, submit, bannerVisible, headingVisible];

test('by default only the last QA Step has a Result Screenshot, stored beside its Step Screenshot', () => {
  const recording = record(signIn);

  assert.deepEqual(images(recording), [
    ['png:open-after', undefined],
    ['png:fill-action', undefined],
    // The page once the step's last check confirmed its Expected Result.
    ['png:submit-action', 'png:heading-after'],
  ]);
  const last = recording.bundle.steps[2];
  assert.equal(last.resultAssetId, 'step-03-result');
  assert.deepEqual(recording.bundle.assets['step-03-result'], {
    id: 'step-03-result',
    contentType: 'image/png',
    filename: 'step-03-result.png',
    sha256: undefined,
  });
});

test('without a check that has one, the Result Screenshot is the page after the Action', () => {
  const recording = record([open, fill, submit, bannerVisible], {
    from: new MapScreenshotSource({
      submit: {
        screenshots: [shot('submit-action', 'action')],
        result: shot('submit-after', 'after'),
      },
    }),
  });
  assert.deepEqual(images(recording).at(-1), [
    'png:submit-action',
    'png:submit-after',
  ]);
});

test('the latest check with a result wins over earlier ones', () => {
  const recording = record(signIn, {
    from: new MapScreenshotSource(
      { submit: { screenshots: [shot('submit-action', 'action')] } },
      { banner: { result: shot('banner-after', 'after') }, heading: {} },
    ),
  });
  assert.deepEqual(images(recording).at(-1), [
    'png:submit-action',
    'png:banner-after',
  ]);
});

test('a source with nothing after the Action gives no Result Screenshot', () => {
  const recording = record(signIn, {
    from: new MapScreenshotSource({
      submit: { screenshots: [shot('submit-action', 'action')] },
    }),
  });
  assert.deepEqual(images(recording).at(-1), ['png:submit-action', undefined]);
  assert.deepEqual(Object.keys(recording.bundle.assets), ['step-03']);
});

test('a Result Screenshot identical to the Step Screenshot is not shown twice', () => {
  const recording = record([open], { resultScreenshots: 'every' });
  assert.deepEqual(images(recording), [['png:open-after', undefined]]);
});

test('every step, or none, can have a Result Screenshot', () => {
  assert.deepEqual(images(record(signIn, { resultScreenshots: 'every' })), [
    ['png:open-after', undefined],
    ['png:fill-action', 'png:fill-after'],
    ['png:submit-action', 'png:heading-after'],
  ]);
  assert.deepEqual(images(record(signIn, { resultScreenshots: 'none' })), [
    ['png:open-after', undefined],
    ['png:fill-action', undefined],
    ['png:submit-action', undefined],
  ]);
});

test('an override matches the step text as the tester reads it and chooses action, result, or both', () => {
  const recording = record(signIn, {
    resultScreenshots: {
      overrides: [
        { match: 'into Username', screenshots: 'both' },
        { match: /Submit/, screenshots: 'action' },
      ],
    },
  });
  assert.deepEqual(images(recording), [
    ['png:open-after', undefined],
    ['png:fill-action', 'png:fill-after'],
    ['png:submit-action', undefined],
  ]);

  const resultOnly = record(signIn, {
    resultScreenshots: {
      overrides: [{ match: 'Click the Submit button', screenshots: 'result' }],
    },
  });
  assert.deepEqual(images(resultOnly).at(-1), [undefined, 'png:heading-after']);
  // The Highlight belongs to the Step Screenshot; with none, the step has no moment.
  assert.equal(resultOnly.bundle.steps[2].screenshotMoment, undefined);
});

test('a step asked for its Result Screenshot alone keeps its Step Screenshot when there is no result', () => {
  const recording = record(signIn, {
    resultScreenshots: {
      overrides: [{ match: 'Submit', screenshots: 'result' }],
    },
    from: new MapScreenshotSource({
      submit: { screenshots: [shot('submit-action', 'action')] },
    }),
  });
  assert.deepEqual(images(recording).at(-1), ['png:submit-action', undefined]);
});

test('an override matches the step text as masked, never a secret the tester cannot read', () => {
  const recordWith = (match: string) => {
    const recorder = new QaInstructionsRecorder({
      masker: new SecretMasker(['demo']),
      resultScreenshots: new ResultScreenshotRule({
        overrides: [{ match, screenshots: 'both' }],
      }),
    });
    for (const event of [start, fill, submit, passed]) recorder.handle(event);
    return recorder.toRecording(source);
  };
  assert.equal(recordWith('demo').bundle.steps[0].resultAssetId, undefined);
  assert.equal(
    recordWith('Type [masked] into').bundle.steps[0].resultAssetId,
    'step-01-result',
  );
});

test('a collapsed group shows the page after its last Action', () => {
  const recording = record(
    [
      { type: 'groupStart', title: 'Sign in' },
      open,
      fill,
      submit,
      { type: 'groupEnd', title: 'Sign in' },
    ],
    {
      sections: 'collapse',
      from: new MapScreenshotSource({
        open: { screenshots: [shot('open-after', 'after')] },
        fill: { screenshots: [], result: shot('fill-after', 'after') },
        submit: { screenshots: [], result: shot('submit-after', 'after') },
      }),
    },
  );
  assert.deepEqual(images(recording), [['png:open-after', 'png:submit-after']]);
});

/** An annotator recording which images it was asked to draw on. */
class RecordingAnnotator implements ScreenshotAnnotator {
  readonly drawn: string[] = [];

  async size(): Promise<QaSize> {
    return { width: 800, height: 600 };
  }

  async draw(image: StepImage, highlight: Highlight): Promise<Buffer> {
    this.drawn.push(image.data.toString());
    void highlight;
    return Buffer.from(`${image.data.toString()}+marked`);
  }
}

test('a Result Screenshot is never highlighted', async () => {
  const annotator = new RecordingAnnotator();
  const highlighted = await new StepScreenshotHighlighter(
    annotator,
    new HighlightPlanner(),
  ).highlight(record(signIn, { resultScreenshots: 'every' }));

  assert.deepEqual(annotator.drawn, ['png:fill-action', 'png:submit-action']);
  assert.deepEqual(images(highlighted).at(-1), [
    'png:submit-action+marked',
    'png:heading-after',
  ]);
  assert.equal(
    highlighted.bundle.assets['step-03-result'].highlight,
    undefined,
  );
});

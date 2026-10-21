import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import type { ActionCapture, Screenshot } from '../../src/core/index.js';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { PNG } from 'pngjs';
import sharp from 'sharp';

import { ActionRef, CheckRef } from '../../src/playwright/action-ref.js';
import { TraceScreenshotSource } from '../../src/playwright/trace-screenshot-source.js';

/** Sample traces recorded from test/fixtures/traces/scenario.spec.ts. */
const TRACES = {
  9: fixture('v9.zip'),
  10: fixture('v10.zip'),
};

function fixture(name: string): string {
  return fileURLToPath(
    new URL(
      `../../../test/playwright/fixtures/traces/${name}`,
      import.meta.url,
    ),
  );
}

// The scenario's reported `pw:api` steps in order: three fixture calls, then
// the test body. Its `textContent()` getter is traced but not reported, so it
// is not numbered.
const NAVIGATE = ActionRef.of(4, 'Navigate');
const FILL = ActionRef.of(5, 'Fill "Ada"');
const CLICK = ActionRef.of(6, 'Click');
const PRESS = ActionRef.of(7, 'Press "Tab"');

const GREEN = { r: 0x00, g: 0xaa, b: 0x00 };
const RED = { r: 0xcc, g: 0x00, b: 0x00 };

function moments(capture: ActionCapture | undefined): string[] {
  return (capture?.screenshots ?? []).map((s) => s.moment).sort();
}

function shot(capture: ActionCapture | undefined, moment: string): Screenshot {
  const screenshot = capture?.screenshots.find((s) => s.moment === moment);
  assert.ok(screenshot, `expected a ${moment} screenshot`);
  return screenshot;
}

function pixel(screenshot: Screenshot, x: number, y: number) {
  const png = PNG.sync.read(screenshot.data);
  const i = (png.width * y + x) * 4;
  return { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
}

for (const [version, path] of Object.entries(TRACES)) {
  test(`trace format ${version}: every Action has screenshots from its trace`, async () => {
    const source = await TraceScreenshotSource.open(path);

    assert.deepEqual(moments(source.capture(NAVIGATE)), ['after', 'before']);
    assert.deepEqual(moments(source.capture(FILL)), [
      'action',
      'after',
      'before',
    ]);
    assert.deepEqual(moments(source.capture(CLICK)), [
      'action',
      'after',
      'before',
    ]);
    assert.deepEqual(moments(source.capture(PRESS)), ['action', 'after']);

    const click = source.capture(CLICK);
    const action = shot(click, 'action');
    assert.equal(action.contentType, 'image/png');
    const png = PNG.sync.read(action.data);
    assert.deepEqual([png.width, png.height], [400, 300]);
    // The action-moment image shows the page as it was clicked; after it, the page turned red.
    assert.deepEqual(pixel(action, 10, 10), GREEN);
    assert.deepEqual(pixel(shot(click, 'after'), 10, 10), RED);
  });

  test(`trace format ${version}: element box and click point come from the trace`, async () => {
    const source = await TraceScreenshotSource.open(path);

    const click = source.capture(CLICK);
    assert.deepEqual(click?.box, { x: 40, y: 40, width: 120, height: 40 });
    assert.deepEqual(click?.point, { x: 100, y: 60 });

    const fill = source.capture(FILL);
    assert.equal(fill?.box?.width, 153);
    assert.equal(fill?.point, undefined);

    assert.equal(source.capture(NAVIGATE)?.box, undefined);
    assert.equal(source.capture(PRESS)?.box, undefined);
  });

  test(`trace format ${version}: each capture carries its page's viewport`, async () => {
    const source = await TraceScreenshotSource.open(path);

    for (const ref of [NAVIGATE, FILL, CLICK, PRESS]) {
      assert.deepEqual(source.capture(ref)?.viewport, {
        width: 400,
        height: 300,
      });
    }
  });

  test(`trace format ${version}: Actions the trace has nothing for have no capture`, async () => {
    const source = await TraceScreenshotSource.open(path);

    // Launching the browser happens before the page exists.
    assert.equal(source.capture(ActionRef.of(1, 'Launch browser')), undefined);
    // A ref whose title does not match the trace's step at that position.
    assert.equal(source.capture(ActionRef.of(6, 'Hover')), undefined);
    assert.equal(source.capture(ActionRef.of(99, 'Click')), undefined);
    assert.equal(source.capture('not a ref'), undefined);
  });
}

// The scenario's first check, on the Paint button while the page is green.
const VISIBLE = CheckRef.of(1, 'Expect "toBeVisible"');
const TO_BE = CheckRef.of(2, 'Expect "toBe"');

for (const [version, path] of Object.entries(TRACES)) {
  test(`trace format ${version}: an Action's result is its own screenshot from once it was done`, async () => {
    const source = await TraceScreenshotSource.open(path);

    const click = source.capture(CLICK);
    assert.equal(click?.result?.moment, 'after');
    assert.ok(click?.result?.data.equals(shot(click, 'after').data));
    // The click turned the page red.
    assert.deepEqual(pixel(click.result, 10, 10), RED);
    for (const ref of [NAVIGATE, FILL, PRESS]) {
      const capture = source.capture(ref);
      assert.ok(capture?.result?.data.equals(shot(capture, 'after').data));
    }
  });

  test(`trace format ${version}: a check the browser ran has a result, its page just after the check`, async () => {
    const source = await TraceScreenshotSource.open(path);

    const visible = source.check(VISIBLE)?.result;
    assert.equal(visible?.moment, 'after');
    assert.equal(visible?.contentType, 'image/png');
    assert.ok(visible);
    // Checked before the click: still green.
    assert.deepEqual(pixel(visible, 10, 10), GREEN);
    // A check on a value the test read ran no browser call: nothing pictured.
    assert.equal(source.check(TO_BE)?.result, undefined);
  });
}

for (const [version, path] of Object.entries(TRACES)) {
  test(`trace format ${version} without DOM snapshots: whether a field is a password field is unknown`, async () => {
    const source = await TraceScreenshotSource.open(path);
    assert.equal(source.capture(FILL)?.passwordField, undefined);
    assert.equal(source.capture(CLICK)?.passwordField, undefined);
  });
}

/** Recorded from test/fixtures/traces/password.spec.ts, with DOM snapshots. */
const DOM_TRACE = fixture('v9-dom.zip');
const DOM_REFS = {
  navigate: ActionRef.of(4, 'Navigate'),
  name: ActionRef.of(5, 'Fill "Ada"'),
  password: ActionRef.of(6, 'Fill "hunter2"'),
  click: ActionRef.of(7, 'Click'),
};

test('with DOM snapshots, the trace says which Action touched a password field', async () => {
  const source = await TraceScreenshotSource.open(DOM_TRACE);

  assert.equal(source.capture(DOM_REFS.password)?.passwordField, true);
  assert.equal(source.capture(DOM_REFS.name)?.passwordField, false);
  assert.equal(source.capture(DOM_REFS.click)?.passwordField, false);
  // A navigation touches no element.
  assert.equal(source.capture(DOM_REFS.navigate)?.passwordField, undefined);
  // Screenshots still come through alongside.
  assert.ok((source.capture(DOM_REFS.password)?.screenshots.length ?? 0) > 0);
});

test('the password field type is read case-insensitively', async () => {
  const entries = unzipSync(await readFile(DOM_TRACE));
  for (const [name, data] of Object.entries(entries)) {
    if (!name.endsWith('.trace')) continue;
    entries[name] = strToU8(
      strFromU8(data).replaceAll('"type":"password"', '"type":"PassWord"'),
    );
  }
  const dir = await mkdtemp(path.join(tmpdir(), 'qa-trace-'));
  try {
    const relabeled = path.join(dir, 'trace.zip');
    await writeFile(relabeled, zipSync(entries));
    const source = await TraceScreenshotSource.open(relabeled);
    assert.equal(source.capture(DOM_REFS.password)?.passwordField, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/** A trace's entries with every trace file's format version relabeled. */
function relabeled(
  entries: Record<string, Uint8Array>,
  from: number,
  to: number,
): Record<string, Uint8Array> {
  for (const name of Object.keys(entries)) {
    if (!name.endsWith('.trace')) continue;
    entries[name] = strToU8(
      strFromU8(entries[name]).replaceAll(
        `"version":${from},`,
        `"version":${to},`,
      ),
    );
  }
  return entries;
}

/** Writes `entries` as a trace.zip in a temporary directory and opens it. */
async function openEntries(
  entries: Record<string, Uint8Array>,
): Promise<TraceScreenshotSource> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qa-trace-'));
  try {
    const file = path.join(dir, 'trace.zip');
    await writeFile(file, zipSync(entries));
    return await TraceScreenshotSource.open(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('a trace in an unknown format version gives no screenshots and says why', async () => {
  // The v9 sample, relabeled as a future format.
  const source = await openEntries(
    relabeled(unzipSync(await readFile(TRACES[9])), 9, 11),
  );
  assert.equal(source.capture(CLICK), undefined);
  assert.deepEqual(source.problem, {
    kind: 'unsupportedVersion',
    version: 11,
  });
});

test('a readable trace in a supported version has no problem', async () => {
  const source = await TraceScreenshotSource.open(TRACES[9]);
  assert.equal(source.problem, undefined);
});

test('a missing or unreadable trace gives no screenshots and does not throw', async () => {
  const missing = await TraceScreenshotSource.open('/nonexistent/trace.zip');
  assert.equal(missing.capture(CLICK), undefined);
  assert.equal(missing.problem?.kind, 'unreadable');

  const notAZip = await TraceScreenshotSource.open(
    fileURLToPath(
      new URL(
        '../../../test/playwright/fixtures/traces/scenario.spec.ts',
        import.meta.url,
      ),
    ),
  );
  assert.equal(notAZip.capture(CLICK), undefined);
  assert.equal(notAZip.problem?.kind, 'unreadable');
});

// Trace format 8, recorded from the same scenario with Playwright 1.56
// (`trace: 'on'`). Before 1.63 there are no per-action screenshots, only the
// page's screen recording; step titles carry the locator.
const V8 = {
  NAVIGATE: ActionRef.of(4, 'Navigate to "data:"'),
  FILL: ActionRef.of(5, `Fill "Ada" getByLabel('Name')`),
  CLICK: ActionRef.of(6, `Click getByRole('button', { name: 'Paint' })`),
  PRESS: ActionRef.of(7, 'Press "Tab"'),
};

/** The screen recording's frames in the v8 sample, in the order recorded. */
async function v8Frames(): Promise<Buffer[]> {
  const entries = unzipSync(await readFile(fixture('v8.zip')));
  return Object.keys(entries)
    .filter((name) => name.startsWith('resources/') && name.endsWith('.jpeg'))
    .sort()
    .map((name) => Buffer.from(entries[name]));
}

test('trace format 8: an Action that touched no point gets a screen recording frame from after its end', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8.zip'));
  assert.equal(source.problem, undefined);
  const frames = await v8Frames();
  assert.equal(frames.length, 4);

  for (const [ref, frame] of [
    // The last frame painted after the Action ended and before the next
    // Action began changing the page: for the navigation, the loaded page
    // (frame 0 is the blank page before it); for the fill, "Ada" typed
    // (frame 2, painted during the fill, shows the field still empty).
    [V8.NAVIGATE, 1],
    [V8.FILL, 3],
    // No frame was painted after the key press: the last one by its end.
    [V8.PRESS, 3],
  ] as const) {
    const screenshots = source.capture(ref)?.screenshots ?? [];
    assert.equal(screenshots.length, 1, ref);
    assert.equal(screenshots[0].moment, 'after', ref);
    assert.equal(screenshots[0].contentType, 'image/jpeg', ref);
    assert.ok(
      screenshots[0].data.equals(frames[frame]),
      `${ref}: frame ${frame}`,
    );
  }
});

test('trace format 8 as Playwright 1.53–1.54 write it (every step method "step") gives the same captures', async () => {
  const entries = unzipSync(await readFile(fixture('v8.zip')));
  entries['test.trace'] = strToU8(
    strFromU8(entries['test.trace']).replace(
      /"method":"[^"]+"/g,
      '"method":"step"',
    ),
  );
  const source = await openEntries(entries);
  const frames = await v8Frames();
  assert.ok(source.capture(V8.FILL)?.screenshots[0].data.equals(frames[3]));
  assert.deepEqual(source.capture(V8.CLICK)?.point, { x: 100, y: 60 });
});

test('trace format 8: the click point comes from the trace, with no element box', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8.zip'));
  assert.deepEqual(source.capture(V8.CLICK)?.point, { x: 100, y: 60 });
  assert.equal(source.capture(V8.CLICK)?.box, undefined);
});

/**
 * The v8 sample with its library trace rewritten. In it the click's input
 * snapshot is taken at 2436.618 and the recording's frames arrive at
 * 2332.608, 2360.165, 2390.372, and 2401.415 (frames 0–3), having been
 * painted about 1–4ms earlier (their `frameSwapWallTime`, on the wall clock
 * the context options pair with the trace's clock: frame 3 at 2399.848).
 * The fill's typed value is first recorded by its `after` snapshot, at
 * 2394.213.
 */
async function v8With(
  edit: (libraryTrace: string) => string,
): Promise<TraceScreenshotSource> {
  const entries = unzipSync(await readFile(fixture('v8.zip')));
  entries['0-trace.trace'] = strToU8(edit(strFromU8(entries['0-trace.trace'])));
  return openEntries(entries);
}

test('trace format 8: a click gets the frame drawn at the moment of the Action', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8.zip'));
  const frames = await v8Frames();

  const screenshots = source.capture(V8.CLICK)?.screenshots ?? [];
  assert.deepEqual(
    screenshots.map((s) => s.moment),
    ['action'],
  );
  assert.equal(screenshots[0].contentType, 'image/jpeg');
  // Frame 3 arrived 35ms before the click's input snapshot.
  assert.ok(screenshots[0].data.equals(frames[3]));
});

test('trace format 8: the moment-of-Action frame is the last one drawn before the input, never one after it', async () => {
  // Input at 2399.000: frame 3 (painted 2399.848) is nearer but was painted
  // after it, when the click may already have changed the page.
  const source = await v8With((trace) =>
    trace.replace('"timestamp":2436.618', '"timestamp":2399.000'),
  );
  const frames = await v8Frames();
  const screenshots = source.capture(V8.CLICK)?.screenshots ?? [];
  assert.deepEqual(
    screenshots.map((s) => s.moment),
    ['action'],
  );
  assert.ok(screenshots[0].data.equals(frames[2]));
});

test('trace format 8: with no frame drawn just before the input, a click keeps the frame from its end, unmarked', async () => {
  // Input at 2461.618: the last frame (3) was painted 62ms earlier, only 6ms
  // after the fill changed the page, so it may not show the page as it was
  // by the input, and the recording can go quiet while the page changes.
  const source = await v8With((trace) =>
    trace
      .replace('"timestamp":2436.618', '"timestamp":2461.618')
      .replace('"endTime":2444.709', '"endTime":2464.709'),
  );
  const frames = await v8Frames();
  const screenshots = source.capture(V8.CLICK)?.screenshots ?? [];
  assert.deepEqual(
    screenshots.map((s) => s.moment),
    ['after'],
  );
  assert.ok(screenshots[0].data.equals(frames[3]));
  // The click point is still reported; the core leaves `after` frames unmarked.
  assert.deepEqual(source.capture(V8.CLICK)?.point, { x: 100, y: 60 });
});

test('trace format 8: without the input snapshot the moment of the Action is unknown, so a click keeps the frame from its end', async () => {
  const source = await v8With((trace) =>
    trace
      .split('\n')
      .filter((line) => !line.includes('"snapshotName":"input@call@16"'))
      .join('\n'),
  );
  assert.deepEqual(
    (source.capture(V8.CLICK)?.screenshots ?? []).map((s) => s.moment),
    ['after'],
  );
});

test('trace format 8: an old frame painted well after the page last changed still shows the moment of a click', async () => {
  // Frame 3 moved to 2455.000, 61ms after the fill's value was recorded, and
  // the input to 2520.000: the frame is 65ms old, but the page (DOM, form
  // values, scroll offsets) was the same from before it was painted until
  // the input.
  const source = await v8With((trace) =>
    trace
      .replace(
        '"timestamp":2401.415,"frameSwapWallTime":1790470191121.614',
        '"timestamp":2456.000,"frameSwapWallTime":1790470191176.766',
      )
      .replace('"timestamp":2436.618', '"timestamp":2520.000')
      .replace('"endTime":2444.709', '"endTime":2528.000'),
  );
  const frames = await v8Frames();
  const screenshots = source.capture(V8.CLICK)?.screenshots ?? [];
  assert.deepEqual(
    screenshots.map((s) => s.moment),
    ['action'],
  );
  assert.ok(screenshots[0].data.equals(frames[3]));
});

/**
 * Trace format 8 of a long page (fixtures/traces/scroll.spec.ts, Playwright
 * 1.56): the fill and the Far click make Playwright scroll; the Add click
 * does not. Viewport 400×300; frames are 400×300 JPEGs.
 */
const V8_SCROLL = {
  FILL: ActionRef.of(5, `Fill "3" getByLabel('Quantity')`),
  ADD: ActionRef.of(7, `Click getByRole('button', { name: 'Add' })`),
  FAR: ActionRef.of(8, `Click getByRole('button', { name: 'Far' })`),
};

const SCROLL_PAGE = {
  yellowBand: { r: 0xff, g: 0xd4, b: 0x00 },
  typedField: { r: 0x00, g: 0x00, b: 0xcc },
  button: { r: 0x1f, g: 0x4f, b: 0xd8 },
  clickedButton: { r: 0xcc, g: 0x00, b: 0x00 },
};

async function jpegPixel(screenshot: Screenshot, x: number, y: number) {
  const { data, info } = await sharp(screenshot.data)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (info.width * y + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

/** Within JPEG noise of `expected`. */
function assertColor(
  actual: { r: number; g: number; b: number },
  expected: { r: number; g: number; b: number },
  what: string,
) {
  const off = Math.max(
    Math.abs(actual.r - expected.r),
    Math.abs(actual.g - expected.g),
    Math.abs(actual.b - expected.b),
  );
  assert.ok(
    off <= 40,
    `${what}: rgb(${actual.r},${actual.g},${actual.b}), expected rgb(${expected.r},${expected.g},${expected.b})`,
  );
}

test('trace format 8: a click Playwright scrolled to just before the input is unmarked, on a frame showing its result', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8-scroll.zip'));
  const far = source.capture(V8_SCROLL.FAR);
  assert.deepEqual(far?.point, { x: 80, y: 150 });
  // The frame painted 0.7ms before the input still shows the page before
  // the scroll, so no frame shows the moment of the click.
  assert.deepEqual(moments(far), ['after']);
  // The frame from after it shows the page scrolled to Far, clicked (probed
  // beside its label, which is at the click point).
  assertColor(
    await jpegPixel(shot(far, 'after'), 20, 140),
    SCROLL_PAGE.clickedButton,
    'Far next to the click point',
  );
});

test('trace format 8: a click on a page that had scrolled earlier is marked, on a frame showing the scroll', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8-scroll.zip'));
  const add = source.capture(V8_SCROLL.ADD);
  assert.deepEqual(add?.point, { x: 100, y: 242 });
  assert.deepEqual(moments(add), ['action']);
  // Under the click point: the Add button, not yet clicked.
  assertColor(
    await jpegPixel(shot(add, 'action'), 100, 250),
    SCROLL_PAGE.button,
    'Add under the click point',
  );
});

test('trace format 8: a fill that scrolls gets a frame showing the typed value where the field is', async () => {
  const source = await TraceScreenshotSource.open(fixture('v8-scroll.zip'));
  const fill = source.capture(V8_SCROLL.FILL);
  assert.deepEqual(moments(fill), ['after']);
  const frame = shot(fill, 'after');
  assertColor(
    await jpegPixel(frame, 300, 250),
    SCROLL_PAGE.yellowBand,
    'scrolled to the band',
  );
  assertColor(
    await jpegPixel(frame, 150, 294),
    SCROLL_PAGE.typedField,
    'the typed field',
  );
});

test('trace format 8: a click is never marked on a frame painted before the page reached its scroll position', async () => {
  // Add's input moved to just after the fill: its scroll offsets were first
  // recorded at 89.6ms into the run (the fill's `after` snapshot), and the
  // last frame before this input was painted too soon after to show them.
  const entries = unzipSync(await readFile(fixture('v8-scroll.zip')));
  const library = strFromU8(entries['0-trace.trace']);
  const fillAfter =
    /"snapshotName":"after@call@10"[^\n]*?"timestamp":([\d.]+)/.exec(
      library,
    )?.[1];
  const addInput =
    /"snapshotName":"input@call@14"[^\n]*?"timestamp":([\d.]+)/.exec(
      library,
    )?.[1];
  assert.ok(fillAfter && addInput);
  entries['0-trace.trace'] = strToU8(
    library.replace(
      `"timestamp":${addInput}`,
      `"timestamp":${(Number(fillAfter) + 10).toFixed(3)}`,
    ),
  );
  const source = await openEntries(entries);
  assert.deepEqual(moments(source.capture(V8_SCROLL.ADD)), ['after']);
});

/**
 * Trace format 8 of a smoothly scrolling long page
 * (fixtures/traces/smooth.spec.ts, Playwright 1.56), as on a store's product
 * page: a check of an already checked radio, a fill whose focus starts a
 * smooth scroll that outlasts it, and at once a click on the same form, which
 * waits for the scroll to settle. Viewport 400×300.
 */
const V8_SMOOTH = {
  CHECK: ActionRef.of(5, `Check getByLabel('One time')`),
  FILL: ActionRef.of(6, `Fill "3" getByLabel('Quantity')`),
};

test('trace format 8: a fill whose smooth scroll outlasts it gets no frame painted before the page was found still', async () => {
  // The click logged the page still moving until 515ms before it found it
  // still, and the recording painted no frame from then until the click
  // scrolled: the last frame before that may show the scroll easing in.
  const source = await TraceScreenshotSource.open(fixture('v8-smooth.zip'));
  assert.deepEqual(moments(source.capture(V8_SMOOTH.FILL)), []);
});

test('trace format 8: a fill with no frame painted after it gets no screenshot, never one from before its scroll', async () => {
  // The click's scroll moved to 1ms after the fill ended: no frame was
  // painted between, and the last one by the fill's end shows the page top.
  const entries = unzipSync(await readFile(fixture('v8-smooth.zip')));
  const library = strFromU8(entries['0-trace.trace']);
  const fillEnd =
    /"type":"after","callId":"call@12"[^\n]*?"endTime":([\d.]+)/.exec(
      library,
    )?.[1];
  const clickScroll =
    /"callId":"call@14","time":([\d.]+),"message":" *scrolling into view/.exec(
      library,
    )?.[1];
  assert.ok(fillEnd && clickScroll);
  entries['0-trace.trace'] = strToU8(
    library.replace(
      `"time":${clickScroll}`,
      `"time":${(Number(fillEnd) + 1).toFixed(3)}`,
    ),
  );
  const source = await openEntries(entries);
  assert.deepEqual(moments(source.capture(V8_SMOOTH.FILL)), []);
});

/**
 * The gift-card page's trace from a CI run on Playwright 1.56 (the
 * derived-steps `/gift-cards` test, viewport 800×600), kept as recorded: the
 * fill's focus starts a smooth scroll of about 640ms. The recording painted
 * its last frame before the click scrolled while the page was still easing
 * in, with the form in view but the typed field just below the fold. The
 * click's log saw the page moving 174ms before that frame and first found it
 * still 342ms after it, so no frame is known to show the scroll settled.
 */
const V8_SMOOTH_UNSETTLED_FILL = ActionRef.of(
  5,
  `Fill "3" getByLabel('Gift card quantity')`,
);

test('trace format 8: a fill whose smooth scroll is not known to have settled by any frame gets no screenshot', async () => {
  const source = await TraceScreenshotSource.open(
    fixture('v8-smooth-unsettled.zip'),
  );
  assert.deepEqual(moments(source.capture(V8_SMOOTH_UNSETTLED_FILL)), []);
});

/**
 * The gift-card page's fill on Playwright 1.56, followed only by a check of
 * its value and a 400ms wait (viewport 800×600): nothing that follows logs
 * whether the page is still. The recording paints frames until the trace
 * ends, all while the fill's smooth scroll eases in; the last shows neither
 * the form nor the field, and the wait's last DOM snapshot records the page
 * scrolled on from where it was when the fill ended.
 */
const V8_SMOOTH_EXPECT_FILL = ActionRef.of(
  4,
  `Fill "3" getByLabel('Gift card quantity')`,
);

test('trace format 8: a fill whose smooth scroll no later snapshot shows had settled gets no screenshot', async () => {
  const source = await TraceScreenshotSource.open(
    fixture('v8-smooth-expect.zip'),
  );
  assert.ok(source.capture(V8_SMOOTH_EXPECT_FILL));
  assert.deepEqual(moments(source.capture(V8_SMOOTH_EXPECT_FILL)), []);
});

/**
 * The boots page's traces on Playwright 1.56 (the derived-steps `/order`
 * test, viewport 800×600): the fill scrolls the page at once, and the click
 * then finds the page still, never seeing it move.
 */
const V8_BOOTS_FILL = ActionRef.of(
  5,
  `Fill "3" getByLabel('Trail boots quantity')`,
);

/**
 * `v8-scroll-still.zip`: the recording's last frame before the click
 * scrolled is painted after the click's first DOM snapshot, 9ms after the
 * fill's `after` snapshot first recorded its scroll, and the snapshots
 * record no scroll between the fill's end and the click's check.
 */
test('trace format 8: a fill whose only frame was painted within PAINT_LAG of its recorded scroll gets no screenshot', async () => {
  // That frame happens to show the typed field, but frames painted up to
  // 15ms after a recorded scroll have shown the page before it.
  const source = await TraceScreenshotSource.open(
    fixture('v8-scroll-still.zip'),
  );
  const fill = source.capture(V8_BOOTS_FILL);
  assert.ok(fill);
  assert.deepEqual(moments(fill), []);
});

/** How much longer the click waits for its button to hold still. */
const CLICK_DELAY = 60;
/** How much later the last frame before the click's check is painted. */
const FRAME_DELAY = 55;

/**
 * `v8-scroll-still.zip` as if the click had waited CLICK_DELAY longer for
 * its button to hold still: the click's events from its stability check on
 * move CLICK_DELAY later, and the frames painted between the fill's end and
 * that check FRAME_DELAY later.
 */
async function slowerClickTrace(): Promise<Record<string, Uint8Array>> {
  const entries = unzipSync(await readFile(fixture('v8-scroll-still.zip')));
  const events = strFromU8(entries['0-trace.trace'])
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const stable = events.find(
    (e) =>
      e.type === 'log' &&
      e.callId === 'call@12' &&
      /^ *element is visible, enabled and stable/.test(e.message),
  ).time;
  const fillEnd = events.find(
    (e) => e.type === 'after' && e.callId === 'call@10',
  ).endTime;
  const later = (time: number | undefined, by: number) =>
    time === undefined ? undefined : time + by;
  const shifted = events.map((e) => {
    if (e.type === 'screencast-frame') {
      const by =
        e.timestamp > fillEnd && e.timestamp < stable ? FRAME_DELAY : 0;
      return {
        ...e,
        timestamp: e.timestamp + by,
        frameSwapWallTime: e.frameSwapWallTime + by,
      };
    }
    const at = e.time ?? e.startTime ?? e.endTime ?? e.snapshot?.timestamp;
    if (at === undefined || at < stable) return e;
    return {
      ...e,
      time: later(e.time, CLICK_DELAY),
      startTime: later(e.startTime, CLICK_DELAY),
      endTime: later(e.endTime, CLICK_DELAY),
      ...(e.snapshot && {
        snapshot: {
          ...e.snapshot,
          timestamp: e.snapshot.timestamp + CLICK_DELAY,
        },
      }),
    };
  });
  entries['0-trace.trace'] = strToU8(
    shifted.map((e) => JSON.stringify(e)).join('\n'),
  );
  return entries;
}

test('trace format 8: a fill followed by an Action that found the page still keeps a frame painted well after its scroll', async () => {
  // The last frame before the click's check is now painted over PAINT_LAG
  // after the fill's scroll was recorded. Only the click's check vouches
  // that the page did not scroll between the fill's end and that frame.
  const source = await openEntries(await slowerClickTrace());
  const fill = source.capture(V8_BOOTS_FILL);
  assert.deepEqual(moments(fill), ['after']);
  // The typed field turns green; most of its 140×39 CSS pixels show it.
  const green = await greenPixels(shot(fill, 'after'));
  assert.ok(green >= 2000, `the typed field is shown (${green} green pixels)`);
});

/** How many pixels of a frame show the boots page's typed (green) field. */
async function greenPixels(screenshot: Screenshot): Promise<number> {
  const { data, info } = await sharp(screenshot.data)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let green = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const near = (value: number, want: number) => Math.abs(value - want) <= 40;
    if (near(data[i], 25) && near(data[i + 1], 169) && near(data[i + 2], 116)) {
      green += 1;
    }
  }
  return green;
}

test('trace format 8: a fill whose last frame was painted before its scroll was recorded gets no screenshot, never one of the page before it', async () => {
  // `v8-scroll-stale.zip` (QI-44), from a local run that gave the fill a
  // frame of the page top (1 run in about 500 under load): the only frame
  // after the fill ended was painted 13ms before its `after` snapshot first
  // recorded the scroll, and shows the page as it was before the fill.
  const source = await TraceScreenshotSource.open(
    fixture('v8-scroll-stale.zip'),
  );
  const fill = source.capture(V8_BOOTS_FILL);
  assert.ok(fill);
  assert.deepEqual(moments(fill), []);
});

test('trace format 8: a check Playwright skipped (already checked) gets no screenshot', async () => {
  // Playwright neither scrolled to the radio nor clicked it, so no frame is
  // known to show it: the only one by its end shows the top of the page.
  const source = await TraceScreenshotSource.open(fixture('v8-smooth.zip'));
  assert.deepEqual(moments(source.capture(V8_SMOOTH.CHECK)), []);
});

test('a later trace without per-action screenshots falls back to the screen recording', async () => {
  // The v9 sample with its per-action screenshots replaced by one recorded
  // frame, as `trace: 'on'` without `snapshots.screen` writes it.
  const entries = unzipSync(await readFile(TRACES[9]));
  const shots = Object.keys(entries).filter((n) =>
    n.startsWith('screenshots/'),
  );
  const frame = entries[shots[0]];
  for (const name of shots) delete entries[name];

  const library = Object.keys(entries).find(
    (name) => name.endsWith('.trace') && name !== 'test.trace',
  ) as string;
  const lines = strFromU8(entries[library])
    .split('\n')
    .filter((line) => !line.includes('"type":"screenshot"'));
  const pageId = /"pageId":"([^"]+)"/.exec(lines.join('\n'))?.[1];
  entries['screencast/frame-1.jpeg'] = frame;
  lines.splice(
    1,
    0,
    JSON.stringify({
      type: 'screencast-frame',
      pageId,
      file: 'screencast/frame-1.jpeg',
      width: 400,
      height: 300,
      timestamp: 0,
    }),
  );
  entries[library] = strToU8(lines.join('\n'));

  const source = await openEntries(entries);
  const click = source.capture(CLICK);
  assert.deepEqual(moments(click), ['after']);
  assert.ok(click?.screenshots[0].data.equals(Buffer.from(frame)));
  assert.deepEqual(click?.box, { x: 40, y: 40, width: 120, height: 40 });
  // Without DOM snapshots nothing says the page held still around the
  // frame, so it is no result.
  assert.equal(click?.result, undefined);
  assert.equal(source.check(VISIBLE)?.result, undefined);
});

/**
 * Plain `trace: 'on'` on Playwright 1.63 (format 9) and 1.64 (format 10):
 * no per-action screenshots, so Step Screenshots come from the screen
 * recording (fixtures/traces/trace-on.spec.ts, the derived-steps sign-in
 * test on the fixture site, 800×600). Unlike format 8, a call's `before`
 * event names no page and its `input` event no input snapshot; the call's
 * DOM snapshots carry its page id and a `phase`.
 */
const TRACE_ON = {
  9: fixture('v9-on.zip'),
  10: fixture('v10-on.zip'),
};

const SIGN_IN_STEPS = {
  OPEN: ActionRef.of(4, 'Navigate'),
  SIGN_IN_LINK: ActionRef.of(5, 'Click'),
  FILL: ActionRef.of(6, 'Fill "demo-user"'),
  SUBMIT: ActionRef.of(7, 'Click'),
};

/** Each fixture-site page's marker, at (400, 140). */
const PAGE_MARKERS = {
  home: { r: 0x00, g: 0x55, b: 0xff },
  signIn: { r: 0xff, g: 0x88, b: 0x00 },
  loginFailed: { r: 0xcc, g: 0x00, b: 0x00 },
};

/** Which page a screen recording frame of the fixture site shows. */
async function markerPage(screenshot: Screenshot): Promise<string> {
  const color = await jpegPixel(screenshot, 400, 140);
  const near = (expected: { r: number; g: number; b: number }) =>
    Math.max(
      Math.abs(color.r - expected.r),
      Math.abs(color.g - expected.g),
      Math.abs(color.b - expected.b),
    ) <= 40;
  return (
    Object.entries(PAGE_MARKERS).find(([, rgb]) => near(rgb))?.[0] ??
    `rgb(${color.r},${color.g},${color.b})`
  );
}

/** Each of a step's screenshots, as its moment and the page it shows. */
function markerShots(
  source: TraceScreenshotSource,
): (ref: string) => Promise<string[]> {
  return (ref) =>
    Promise.all(
      (source.capture(ref)?.screenshots ?? []).map(
        async (s) => `${s.moment} ${await markerPage(s)}`,
      ),
    );
}

for (const [version, trace] of Object.entries(TRACE_ON)) {
  test(`trace format ${version} without per-action screenshots: each Action gets a frame of its own moment, as format 8 picks it`, async () => {
    const source = await TraceScreenshotSource.open(trace);
    assert.equal(source.problem, undefined);
    const shots = markerShots(source);

    // The home page as loaded: the last frame painted by the navigation's
    // end (none was painted after it before the click scrolled).
    assert.deepEqual(await shots(SIGN_IN_STEPS.OPEN), ['after home']);
    // The link click: no frame painted just before its input shows the page
    // it met, and none after it was painted PAINT_LAG after it logged its
    // navigation before the fill, so none (QI-67).
    assert.deepEqual(await shots(SIGN_IN_STEPS.SIGN_IN_LINK), []);
    // The fill, after its end, never a frame from before it marked with the
    // field's box: as before 1.63, only a click point marks the moment.
    assert.deepEqual(await shots(SIGN_IN_STEPS.FILL), ['after signIn']);
    // The submit click, at the moment it was made, on the Sign in page.
    assert.deepEqual(await shots(SIGN_IN_STEPS.SUBMIT), ['action signIn']);
  });

  test(`trace format ${version} without per-action screenshots: a result is a frame of the page the Action left`, async () => {
    // A result is optional (only a frame the DOM snapshots vouch for), but
    // one given must show the page as the step left it.
    const source = await TraceScreenshotSource.open(trace);
    for (const [ref, page] of [
      [SIGN_IN_STEPS.OPEN, 'home'],
      [SIGN_IN_STEPS.SIGN_IN_LINK, 'signIn'],
      [SIGN_IN_STEPS.FILL, 'signIn'],
      [SIGN_IN_STEPS.SUBMIT, 'loginFailed'],
    ]) {
      const result = source.capture(ref)?.result;
      if (result) assert.equal(await markerPage(result), page, ref);
    }
  });

  test(`trace format ${version} without per-action or DOM snapshots: each Action still gets a frame of its own page's moment, or none`, async () => {
    // Nothing names a call's page or dates its input: every call is taken
    // to be on the recording's only page, and every frame is from after.
    const entries = unzipSync(await readFile(trace));
    for (const name of Object.keys(entries)) {
      if (!/^\d+-trace\.trace$/.test(name)) continue;
      entries[name] = strToU8(
        strFromU8(entries[name])
          .split('\n')
          .filter((line) => !line.includes('"type":"frame-snapshot"'))
          .join('\n'),
      );
    }
    const shots = markerShots(await openEntries(entries));
    assert.deepEqual(await shots(SIGN_IN_STEPS.OPEN), ['after home']);
    // Nothing shows the page had stopped scrolling after the fill.
    assert.deepEqual(await shots(SIGN_IN_STEPS.FILL), []);
    // Each click's navigation is logged, so it is dated without snapshots
    // too: every frame after either click was painted within PAINT_LAG of
    // its navigation, so could still show the page it left (QI-67).
    assert.deepEqual(await shots(SIGN_IN_STEPS.SIGN_IN_LINK), []);
    assert.deepEqual(await shots(SIGN_IN_STEPS.SUBMIT), []);
  });
}

/**
 * Plain `trace: 'on'` on Playwright 1.63 runs of the derived-steps sign-in
 * test itself (examples/derived-steps/tests/sign-in.spec.ts, the `trace-on`
 * variant), whose test plumbing between the two clicks adds steps: in
 * `v9-on-link-stale.zip` (a CI run) no frame was painted between the Sign
 * in link click's end and the `page.evaluate()` that follows, and the last
 * one painted by its end, 39ms before it logged its navigation, shows the
 * home page; in `v9-on-submit-stale.zip` (a local run under load) the only
 * frames after the submit click were painted 5ms after it logged its
 * navigation and still show the Sign in page. A navigating click gets only
 * a frame painted at least PAINT_LAG after it logged its navigation.
 */
const DERIVED_SIGN_IN_STEPS = {
  SIGN_IN_LINK: ActionRef.of(5, 'Click'),
  SUBMIT: ActionRef.of(10, 'Click'),
};

test('trace format 9 without per-action screenshots: a click that navigated gets no frame painted before its new page could show', async () => {
  const linkShots = markerShots(
    await TraceScreenshotSource.open(fixture('v9-on-link-stale.zip')),
  );
  assert.deepEqual(await linkShots(DERIVED_SIGN_IN_STEPS.SIGN_IN_LINK), []);
  assert.deepEqual(await linkShots(DERIVED_SIGN_IN_STEPS.SUBMIT), [
    'action signIn',
  ]);

  const submitShots = markerShots(
    await TraceScreenshotSource.open(fixture('v9-on-submit-stale.zip')),
  );
  assert.deepEqual(await submitShots(DERIVED_SIGN_IN_STEPS.SUBMIT), []);
});

test('trace format 8: a click that navigated keeps the frame it had before 1.63', async () => {
  // Only from format 9 does a navigation date a click's frame: the CI trace,
  // relabeled as format 8, gives the link click its last frame by its end.
  const entries = unzipSync(await readFile(fixture('v9-on-link-stale.zip')));
  const shots = markerShots(await openEntries(relabeled(entries, 9, 8)));
  assert.deepEqual(await shots(DERIVED_SIGN_IN_STEPS.SIGN_IN_LINK), [
    'after home',
  ]);
});

test('trace format 9: an Action that waited for an earlier navigation before its input keeps its own frame', async () => {
  // Before acting, an Action waits for a navigation still under way and
  // logs `navigated to` too. The v9 sample's fill, given such a line, is
  // still dated by its own end, as it navigated nothing.
  const entries = unzipSync(await readFile(TRACE_ON[9]));
  const fillStart =
    '{"type":"log","callId":"call@21","time":1233.204,"message":"attempting fill action"}';
  const waited =
    '{"type":"log","callId":"call@21","time":1233.2,"message":"  navigated to \\"http://127.0.0.1:4321/login\\""}';
  const trace = strFromU8(entries['1-trace.trace']);
  assert.ok(trace.includes(fillStart), 'the fill logs its start');
  entries['1-trace.trace'] = strToU8(
    trace.replace(fillStart, `${waited}\n${fillStart}`),
  );
  const shots = markerShots(await openEntries(entries));
  assert.deepEqual(await shots(SIGN_IN_STEPS.FILL), ['after signIn']);
});

/** A frame of a sample trace's screen recording, by its file name. */
async function recordedFrame(trace: string, file: string): Promise<Buffer> {
  const entries = unzipSync(await readFile(fixture(trace)));
  const data = entries[`resources/${file}`];
  assert.ok(data, `${trace} has ${file}`);
  return Buffer.from(data);
}

test('trace format 8: an Action the page held still after has a result, the last frame painted while it did', async () => {
  // The Far click is the scroll page's last Action, followed only by a 300ms
  // wait whose DOM snapshots record the page as the click left it, and the
  // recording painted frames all through the wait. Its result is the last
  // one painted before the wait's last snapshot.
  const source = await TraceScreenshotSource.open(fixture('v8-scroll.zip'));
  const result = source.capture(V8_SCROLL.FAR)?.result;
  assert.ok(result, 'the Far click has a result');
  assert.equal(result.moment, 'after');
  assert.equal(result.contentType, 'image/jpeg');
  assert.ok(
    result.data.equals(
      await recordedFrame(
        'v8-scroll.zip',
        'page@66ea15b2744685946edfacde8c8ec471-1790474026904.jpeg',
      ),
    ),
  );
  // Scrolled to Far, clicked (probed beside its label).
  assertColor(
    await jpegPixel(result, 20, 140),
    SCROLL_PAGE.clickedButton,
    'Far, clicked',
  );
});

test('trace format 8: an Action no later DOM snapshot shows the page held still after has no result', async () => {
  // The scroll page's trace without the wait's snapshots, as when the test
  // ends right after the click: every frame painted after it is as before,
  // but nothing records the page as it was when they were painted.
  const entries = unzipSync(await readFile(fixture('v8-scroll.zip')));
  entries['0-trace.trace'] = strToU8(
    strFromU8(entries['0-trace.trace'])
      .split('\n')
      .filter((line) => !/"snapshotName":"(before|after)@call@18"/.test(line))
      .join('\n'),
  );
  const source = await openEntries(entries);
  assert.ok(source.capture(V8_SCROLL.FAR));
  assert.equal(source.capture(V8_SCROLL.FAR)?.result, undefined);
});

test('trace format 8: a fill whose smooth scroll was under way in every frame after it has no result', async () => {
  // Frames were painted all through the scroll, but the page changed from
  // how the fill left it before any of them could show it.
  const source = await TraceScreenshotSource.open(fixture('v8-smooth.zip'));
  assert.ok(source.capture(V8_SMOOTH.FILL));
  assert.equal(source.capture(V8_SMOOTH.FILL)?.result, undefined);
});

test('trace format 8: the last step of a test that ends at once after its check has no result', async () => {
  // The boots page's click and its check, the test's last calls: the
  // recording painted no frame after the click, so none shows its result.
  const source = await TraceScreenshotSource.open(
    fixture('v8-scroll-still.zip'),
  );
  const click = ActionRef.of(
    6,
    `Click getByRole('button', { name: 'Add Trail boots to cart' })`,
  );
  const added = CheckRef.of(1, 'Expect "toBeVisible"');
  assert.ok(source.capture(click));
  assert.ok(source.check(added));
  assert.equal(source.capture(click)?.result, undefined);
  assert.equal(source.check(added)?.result, undefined);
});

test('trace format 8: steps whose page changed too soon before any frame have no result', async () => {
  // The sample scenario: every frame was painted within 50ms of the page
  // changing, so it may still show the page from before the change.
  const source = await TraceScreenshotSource.open(fixture('v8.zip'));
  for (const ref of Object.values(V8)) {
    assert.ok(source.capture(ref), ref);
    assert.equal(source.capture(ref)?.result, undefined, ref);
  }
  assert.ok(source.check(VISIBLE), 'the check is in the trace');
  assert.equal(source.check(VISIBLE)?.result, undefined);
});

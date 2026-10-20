import { test, expect } from '@playwright/test';
import { Rgb, type BundleStep, type RgbColor } from '@qa-instructions/e2e-kit';

import { GOLDENS, SavedTest, colorAt } from './shared.ts';

// Every QA Step has a Step Screenshot from the trace's screen recording (a
// JPEG frame). A click whose frame shows the moment it was made (moment
// `action`) has its click point marked; every other frame is from after the
// Action ended (moment `after`) and is left unmarked. Frames are JPEG and
// whether one shows a click's moment depends on the recording's timing, so
// these are checks with a color tolerance, not image snapshots.

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

/** The Highlight color, written out so the checks sit apart from the drawing. */
const HIGHLIGHT: RgbColor = [255, 0, 128];
/** Per channel; the frames are JPEG, so colors drift a little. */
const TOLERANCE = 40;

/** The smoothly scrolling page's form, far below the fold. */
const GIFT_CARDS = 'long-page--order-gift-cards-on-a-smoothly-scrolling-page';

/**
 * Whether a step may have no Step Screenshot rather than a misleading one:
 * a fill when the recording painted no frame between it and the next Action
 * (every earlier frame may show the field before it was typed into), and
 * the check of an already checked option (Playwright never scrolls to it).
 */
function mayLackScreenshot(name: string, step: BundleStep): boolean {
  return (
    step.action.startsWith('Type ') || (name === GIFT_CARDS && step.index === 2)
  );
}

function isRecordingFrame(data: Buffer): boolean {
  return data.subarray(0, 3).equals(JPEG) && data.length >= 1000;
}

/** How many click points of a test's screenshots show the Highlight. */
async function markedClicks(name: string): Promise<number> {
  const saved = new SavedTest(name);
  const bundle = await saved.bundle();
  let marked = 0;
  for (const step of bundle.steps) {
    if (
      step.screenshotMoment !== 'action' ||
      !step.clickPoint ||
      !step.viewport
    ) {
      continue;
    }
    const data = await saved.asset(bundle, step.assetIds![0]);
    const color = await colorAt(data, step.clickPoint, step.viewport);
    if (Rgb.near(color, HIGHLIGHT, TOLERANCE)) marked += 1;
  }
  return marked;
}

for (const name of GOLDENS) {
  test(`${name}: its page shows every Step and Result Screenshot`, async () => {
    const saved = new SavedTest(name);
    const bundle = await saved.bundle();
    const shown =
      (await saved.page()).match(/src="data:image\/\w+;base64,/g)?.length ?? 0;
    const screenshots = bundle.steps.flatMap((s) => [
      ...(s.assetIds?.length ? [s.assetIds[0]] : []),
      ...(s.resultAssetId ? [s.resultAssetId] : []),
    ]).length;
    expect(shown, 'screenshots on the page').toBe(screenshots);
  });

  test(`${name}: each Step Screenshot is a recording frame, marked as its moment`, async () => {
    const saved = new SavedTest(name);
    const bundle = await saved.bundle();
    for (const step of bundle.steps) {
      const label = `step ${step.index}`;
      if (!step.assetIds?.length && mayLackScreenshot(name, step)) continue;
      expect(step.assetIds, `${label}: Step Screenshots`).toHaveLength(1);
      const atAction = step.screenshotMoment === 'action';
      if (atAction) {
        expect(
          step.clickPoint,
          `${label}: click point of an Action shot`,
        ).toBeDefined();
      } else {
        expect(step.screenshotMoment, `${label}: moment`).toBe('after');
      }
      const asset = bundle.assets[step.assetIds![0]];
      // No element box before 1.63, so a click is marked by its dot alone.
      expect(asset.highlight, `${label}: Highlight`).toEqual(
        atAction ? ['clickDot'] : undefined,
      );
      const data = await saved.asset(bundle, step.assetIds![0]);
      expect(
        isRecordingFrame(data),
        `${label}: ${asset.filename} is a recording frame`,
      ).toBe(true);
      if (!atAction || !step.clickPoint || !step.viewport) continue;
      const color = await colorAt(data, step.clickPoint, step.viewport);
      expect(
        Rgb.near(color, HIGHLIGHT, TOLERANCE),
        `${label}: click point is rgb(${color}), expected the Highlight rgb(${HIGHLIGHT})`,
      ).toBe(true);
    }
  });

  test(`${name}: a Result Screenshot is an unhighlighted recording frame`, async () => {
    // Before 1.63 a Result Screenshot is a screen recording frame, given only
    // when the trace shows the frame pictures the page as the step left it,
    // so a step may have none.
    const saved = new SavedTest(name);
    const bundle = await saved.bundle();
    for (const step of bundle.steps) {
      if (!step.resultAssetId) continue;
      const asset = bundle.assets[step.resultAssetId];
      expect(
        asset.highlight,
        `step ${step.index}: Result Screenshot highlight`,
      ).toBeUndefined();
      expect(
        isRecordingFrame(await saved.asset(bundle, step.resultAssetId)),
        `step ${step.index}: ${asset.filename} is a recording frame`,
      ).toBe(true);
    }
  });
}

// Whether a frame shows the moment of a click depends on the recording's
// timing, so not every click gets one; but most do, and some must.
test('some click point is marked', async () => {
  let marked = 0;
  for (const name of GOLDENS) marked += await markedClicks(name);
  expect(marked, 'click points marked with the Highlight').toBeGreaterThan(0);
});

// The long page: Playwright scrolls to the field before typing and to the
// button before clicking. The fill's screenshot must show the typed value
// (the field turns green); the click is marked only on a frame showing the
// button under the click point, not yet clicked (it turns gray).
test.describe('the long page', () => {
  const LONG_PAGE = 'long-page--order-boots-from-the-bottom-of-the-page';
  const CHANGED_FIELD: RgbColor = [25, 169, 116];
  const BUTTON: RgbColor = [31, 79, 216];

  test('the fill shows the typed value', async () => {
    const saved = new SavedTest(LONG_PAGE);
    const bundle = await saved.bundle();
    const fill = bundle.steps[1];
    test.skip(
      !fill.assetIds?.length,
      'no frame is known to show the fill (the click scrolled first)',
    );
    // The field is 140×39 CSS pixels; most of it shows the green. The click
    // usually scrolls before the recording paints a frame known to show the
    // fill, so the fill may have no screenshot, never one without the value.
    const green = (
      await Rgb.decode(await saved.asset(bundle, fill.assetIds![0]))
    ).countNear(CHANGED_FIELD, TOLERANCE);
    expect(green, 'green pixels of the typed field').toBeGreaterThanOrEqual(
      2000,
    );
  });

  test('a click marked at its moment is marked on the button', async () => {
    const saved = new SavedTest(LONG_PAGE);
    const bundle = await saved.bundle();
    const click = bundle.steps[2];
    test.skip(
      click.screenshotMoment !== 'action',
      'the frame shows the click already made',
    );
    // Beside the dot (radius 6), inside the 240×51 button.
    const beside = { x: click.clickPoint!.x - 20, y: click.clickPoint!.y };
    const color = await colorAt(
      await saved.asset(bundle, click.assetIds![0]),
      beside,
      click.viewport!,
    );
    expect(
      Rgb.near(color, BUTTON, TOLERANCE),
      `rgb(${color}) beside the dot`,
    ).toBe(true);
  });
});

// The smoothly scrolling page: the fill's focus starts a scroll that runs on
// after the fill ends. Its screenshot, if any, must show the form (yellow)
// with the typed field (green), not the top of the page.
test('the smooth-scroll fill shows the form with the typed field', async () => {
  const FORM: RgbColor = [255, 212, 0];
  const CHANGED_FIELD: RgbColor = [25, 169, 116];
  const saved = new SavedTest(GIFT_CARDS);
  const bundle = await saved.bundle();
  const fill = bundle.steps[2];
  test.skip(
    !fill.assetIds?.length,
    'the recording painted no frame for the fill',
  );
  const image = await Rgb.decode(await saved.asset(bundle, fill.assetIds![0]));
  // At least a strip of the 140×39 field, at the bottom edge if the scroll
  // brought it just into view.
  expect(
    image.countNear(FORM, TOLERANCE),
    'form pixels',
  ).toBeGreaterThanOrEqual(20000);
  expect(
    image.countNear(CHANGED_FIELD, TOLERANCE),
    'green pixels',
  ).toBeGreaterThanOrEqual(500);
});

// Sign-in's last step (Submit bad credentials) ends the test at once after
// its checks, so the recording rarely has a frame known to show the Login
// failed page. Its Result Screenshot may be absent, but if present it must
// show that page's error banner, never the sign-in form before it.
test("sign-in's Result Screenshot, if any, shows the Login failed banner", async () => {
  const ERROR_BANNER: RgbColor = [204, 0, 0];
  const saved = new SavedTest('sign-in--sign-in-with-bad-credentials');
  const bundle = await saved.bundle();
  const last = bundle.steps.at(-1)!;
  test.skip(!last.resultAssetId, 'no Result Screenshot for the last step');
  const viewport = last.viewport ?? { width: 800, height: 600 };
  const color = await colorAt(
    await saved.asset(bundle, last.resultAssetId!),
    { x: 400, y: 140 },
    viewport,
  );
  expect(
    Rgb.near(color, ERROR_BANNER, TOLERANCE),
    `rgb(${color}) at the banner`,
  ).toBe(true);
});

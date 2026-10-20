import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';

import { ProbeSheet } from '../src/probe-sheet.ts';
import { Rgb } from '../src/rgb.ts';

/** A 20x10 image: left half red, right half blue, with one green pixel at (9, 5). */
async function redAndBlue(): Promise<Buffer> {
  const raw = Buffer.alloc(20 * 10 * 3);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 20; x++) {
      raw.set(x < 10 ? [255, 0, 0] : [0, 0, 255], (y * 20 + x) * 3);
    }
  }
  raw.set([0, 255, 0], (5 * 20 + 9) * 3);
  return sharp(raw, { raw: { width: 20, height: 10, channels: 3 } })
    .png()
    .toBuffer();
}

test('a sheet is one pixel per probe point, side by side', async () => {
  const sheet = await Rgb.decode(
    await ProbeSheet.png(await redAndBlue(), [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
    ]),
  );
  assert.equal(sheet.width, 2);
  assert.equal(sheet.height, 1);
  assert.deepEqual(sheet.colorAt({ x: 0, y: 0 }), [255, 0, 0]);
  assert.deepEqual(sheet.colorAt({ x: 1, y: 0 }), [0, 0, 255]);
});

test('a probe reads its own pixel, not its neighbors', async () => {
  const sheet = await Rgb.decode(
    await ProbeSheet.png(await redAndBlue(), [{ x: 9, y: 5 }]),
  );
  assert.deepEqual(sheet.colorAt({ x: 0, y: 0 }), [0, 255, 0]);
});

test('colors are matched within a per-channel tolerance', () => {
  assert.ok(Rgb.near([250, 5, 0], [255, 0, 0], 8));
  assert.ok(!Rgb.near([240, 0, 0], [255, 0, 0], 8));
});

test('a snapshot threshold accepts every shift within the tolerance', () => {
  for (const tolerance of [8, 40]) {
    const worst = ProbeSheet.worstDelta(tolerance);
    // pixelmatch accepts a pixel when its YIQ delta is at most
    // 35215 * threshold^2.
    assert.ok(35215 * ProbeSheet.threshold(tolerance) ** 2 >= worst);
    // And accepts little beyond it: the next level of shift is rejected.
    assert.ok(
      35215 * ProbeSheet.threshold(tolerance) ** 2 <
        ProbeSheet.worstDelta(tolerance + 1),
    );
  }
});

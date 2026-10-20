import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';

import { ProbeSheet } from '../src/probe-sheet.ts';
import { Rgb } from '../src/rgb.ts';

/** A 20x10 image: left half red, right half blue. */
async function redAndBlue(): Promise<Buffer> {
  const raw = Buffer.alloc(20 * 10 * 3);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 20; x++) {
      raw.set(x < 10 ? [255, 0, 0] : [0, 0, 255], (y * 20 + x) * 3);
    }
  }
  return sharp(raw, { raw: { width: 20, height: 10, channels: 3 } })
    .png()
    .toBuffer();
}

test('a sheet is one patch per probe point, side by side', async () => {
  const sheet = await Rgb.decode(
    await ProbeSheet.png(
      await redAndBlue(),
      [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
      ],
      1,
    ),
  );
  assert.equal(sheet.width, 2 * ProbeSheet.PATCH);
  assert.equal(sheet.height, ProbeSheet.PATCH);
  assert.deepEqual(sheet.colorAt({ x: 0, y: 0 }), [255, 0, 0]);
  assert.deepEqual(sheet.colorAt({ x: ProbeSheet.PATCH, y: 0 }), [0, 0, 255]);
});

test('a patch is as many pixels wide as the screenshot is scaled', async () => {
  const sheet = await Rgb.decode(
    await ProbeSheet.png(await redAndBlue(), [{ x: 5, y: 5 }], 2),
  );
  assert.equal(sheet.width, ProbeSheet.PATCH * 2);
});

test('colors are matched within a per-channel tolerance', () => {
  assert.ok(Rgb.near([250, 5, 0], [255, 0, 0], 8));
  assert.ok(!Rgb.near([240, 0, 0], [255, 0, 0], 8));
});

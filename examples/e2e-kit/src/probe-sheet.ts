import sharp from 'sharp';

import { Rgb, type Point } from './rgb.ts';

/**
 * The few pixels of a screenshot a check is about, as one small PNG for an
 * image snapshot: one pixel per probe point, side by side. Whole screenshots
 * differ between machines (fonts), so a snapshot compares only the places a
 * check looks at. One pixel, not a patch: a Highlight's edge can land a pixel
 * either way when an element sits at a different sub-pixel position on
 * another machine, and the probe point is chosen to be inside it.
 */
export class ProbeSheet {
  /** Points are in image pixels. */
  static async png(image: Buffer, points: readonly Point[]): Promise<Buffer> {
    const decoded = await Rgb.decode(image);
    const raw = Buffer.alloc(points.length * 3);
    points.forEach((point, i) => raw.set(decoded.colorAt(point), i * 3));
    return sharp(raw, { raw: { width: points.length, height: 1, channels: 3 } })
      .png()
      .toBuffer();
  }

  /** pixelmatch's largest YIQ distance, which its `threshold` scales. */
  private static readonly MAX_DELTA = 35215;

  /**
   * The largest pixelmatch YIQ distance between two colors that differ by at
   * most `tolerance` in every channel: the worst corner of that cube.
   */
  static worstDelta(tolerance: number): number {
    let worst = 0;
    for (const dr of [-tolerance, tolerance]) {
      for (const dg of [-tolerance, tolerance]) {
        for (const db of [-tolerance, tolerance]) {
          const y = 0.29889531 * dr + 0.58662247 * dg + 0.11448223 * db;
          const i = 0.59597799 * dr - 0.2741761 * dg - 0.32180189 * db;
          const q = 0.21147017 * dr - 0.52261711 * dg + 0.31114694 * db;
          worst = Math.max(
            worst,
            0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q,
          );
        }
      }
    }
    return worst;
  }

  /**
   * The `threshold` for `toMatchSnapshot` that accepts what a per-channel
   * `tolerance` accepts: every color within it, as little beyond it as the
   * YIQ distance allows.
   */
  static threshold(tolerance: number): number {
    const exact = Math.sqrt(
      ProbeSheet.worstDelta(tolerance) / ProbeSheet.MAX_DELTA,
    );
    // So rounding cannot reject the worst corner itself.
    return exact * (1 + 1e-9);
  }
}

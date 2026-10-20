import sharp from 'sharp';

import { Rgb, type Point } from './rgb.ts';

/**
 * The few pixels of a screenshot a check is about, as one small PNG for an
 * image snapshot: a square patch around each probe point, side by side.
 * Whole screenshots differ between machines (fonts), so a snapshot compares
 * only the places a check looks at.
 */
export class ProbeSheet {
  /** The patch's side, in CSS pixels. */
  static readonly PATCH = 3;

  /** `scale` is the screenshot's pixels per CSS pixel; points are in image pixels. */
  static async png(
    image: Buffer,
    points: readonly Point[],
    scale: number,
  ): Promise<Buffer> {
    const decoded = await Rgb.decode(image);
    const side = Math.round(ProbeSheet.PATCH * scale);
    const width = side * points.length;
    const raw = Buffer.alloc(width * side * 3);
    points.forEach((point, patch) => {
      const left = Math.round(point.x - side / 2);
      const top = Math.round(point.y - side / 2);
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const color = decoded.colorAt({ x: left + x, y: top + y });
          raw.set(color, (y * width + patch * side + x) * 3);
        }
      }
    });
    return sharp(raw, { raw: { width, height: side, channels: 3 } })
      .png()
      .toBuffer();
  }
}

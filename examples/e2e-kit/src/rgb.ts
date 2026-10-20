import sharp from 'sharp';

export interface Point {
  x: number;
  y: number;
}

export type RgbColor = readonly [number, number, number];

/** A decoded image, for sampling pixels. */
export class Rgb {
  readonly width: number;
  readonly height: number;
  private readonly channels: number;
  private readonly pixels: Buffer;

  private constructor(
    width: number,
    height: number,
    channels: number,
    pixels: Buffer,
  ) {
    this.width = width;
    this.height = height;
    this.channels = channels;
    this.pixels = pixels;
  }

  static async decode(data: Buffer): Promise<Rgb> {
    const { data: pixels, info } = await sharp(data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Rgb(info.width, info.height, info.channels, pixels);
  }

  /** The color at an image pixel, clamped to the image. */
  colorAt(point: Point): RgbColor {
    const x = Math.min(this.width - 1, Math.max(0, point.x));
    const y = Math.min(this.height - 1, Math.max(0, point.y));
    const i = (this.width * y + x) * this.channels;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]];
  }

  /** How many pixels are within `tolerance` per channel of `color`. */
  countNear(color: RgbColor, tolerance: number): number {
    let count = 0;
    for (let i = 0; i < this.pixels.length; i += this.channels) {
      const pixel: RgbColor = [
        this.pixels[i],
        this.pixels[i + 1],
        this.pixels[i + 2],
      ];
      if (Rgb.near(pixel, color, tolerance)) count += 1;
    }
    return count;
  }

  static near(
    actual: RgbColor,
    expected: RgbColor,
    tolerance: number,
  ): boolean {
    return actual.every((c, k) => Math.abs(c - expected[k]) <= tolerance);
  }
}

import type { Point } from '@qa-instructions/e2e-kit';

/** A box in viewport CSS pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a probe looks: a fixed viewport point, or relative to a step's element or click. */
export interface ProbeSpec {
  name: string;
  at?:
    | 'clickPoint'
    | 'elementBoxCenter'
    | 'inside'
    | 'outline'
    | 'outlineDash'
    | 'outlineDashGap'
    | 'badge';
  x?: number;
  y?: number;
  /** For `inside`: from the element's left edge (its right edge if negative). */
  dx?: number;
}

/** What a step's geometry needs from the saved data. */
export interface StepGeometry {
  elementBox?: Box;
  clickPoint?: Point;
}

/**
 * The documented Highlight geometry, in CSS pixels: the outline sits 2px
 * clear of the element and is 3px thick; an approximate outline's dashes are
 * 6px; the step-number badge (radius 11) is centered on the outline's corner.
 * Written out here rather than imported, so the probes sit where the drawing
 * is documented, independently of the code that plans it.
 */
const OUTLINE_GAP = 2;
const OUTLINE_WIDTH = 3;
const OUTLINE_DASH = 6;
const BADGE_RADIUS = 11;

/** Where a step's probes look in its screenshot, in image pixels. */
export class ProbePoints {
  private readonly step: StepGeometry;
  private readonly scale: number;

  /** `scale` is the screenshot's pixels per CSS pixel. */
  constructor(step: StepGeometry, scale: number) {
    this.step = step;
    this.scale = scale;
  }

  /** The point of `probe`, or undefined when the step lacks what it is relative to. */
  of(probe: ProbeSpec): Point | undefined {
    const { elementBox: box, clickPoint } = this.step;
    switch (probe.at) {
      case undefined:
        return this.at(probe.x ?? 0, probe.y ?? 0);
      case 'clickPoint':
        return clickPoint && this.at(clickPoint.x, clickPoint.y);
    }
    if (!box) return undefined;
    const middleY = box.y + box.height / 2;
    switch (probe.at) {
      case 'elementBoxCenter':
        return this.at(box.x + box.width / 2, middleY);
      case 'inside': {
        const dx = probe.dx ?? 0;
        return this.at(dx >= 0 ? box.x + dx : box.x + box.width + dx, middleY);
      }
      // Halfway through the outline's left edge.
      case 'outline':
        return this.at(box.x - OUTLINE_GAP - OUTLINE_WIDTH / 2, middleY);
      // In the first dash of the outline's top edge, then in the gap after it.
      case 'outlineDash':
      case 'outlineDashGap': {
        const corner = this.outlineCorner(box);
        const along = probe.at === 'outlineDash' ? 2 : OUTLINE_DASH + 4;
        return {
          x: corner.x + Math.floor(along * this.scale),
          y: corner.y + Math.floor(this.scale),
        };
      }
      // Near the top of the badge circle, clear of its number.
      case 'badge': {
        const corner = this.outlineCorner(box);
        const radius = BADGE_RADIUS * this.scale;
        return {
          x: Math.max(corner.x, radius),
          y: Math.floor(Math.max(corner.y, radius) - radius + 3 * this.scale),
        };
      }
      default:
        throw new Error(`unknown probe position "${String(probe.at)}"`);
    }
  }

  private at(x: number, y: number): Point {
    return { x: Math.floor(x * this.scale), y: Math.floor(y * this.scale) };
  }

  /** The top-left corner of the outline's outer edge, in image pixels. */
  private outlineCorner(box: Box): Point {
    const grow = OUTLINE_GAP + OUTLINE_WIDTH;
    return {
      x: Math.max(0, Math.floor((box.x - grow) * this.scale)),
      y: Math.max(0, Math.floor((box.y - grow) * this.scale)),
    };
  }
}

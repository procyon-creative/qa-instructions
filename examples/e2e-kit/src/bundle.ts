import type { Point } from './rgb.ts';

/** A box in viewport CSS pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One QA Step in a test's saved data (`bundle.json`), as far as the checks read it. */
export interface BundleStep {
  index: number;
  action: string;
  url?: string;
  assetIds?: string[];
  resultAssetId?: string;
  screenshotMoment?: string;
  elementBox?: Box;
  clickPoint?: Point;
  viewport?: { width: number; height: number };
}

/** A test's saved data, as far as the checks read it. */
export interface Bundle {
  meta: { testSite?: string };
  steps: BundleStep[];
  assets: Record<string, { filename: string; highlight?: string[] }>;
}

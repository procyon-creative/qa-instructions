import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Bundle } from '@qa-instructions/e2e-kit';

import type { ProbeSpec } from './probe-points.ts';
import { reportOf, root } from './reports.ts';

/** The expectation for one QA Step's screenshots. */
export interface StepSpec {
  /** Which step, when the spec lists only spot checks (1-based). */
  index?: number;
  action?: string;
  moment?: string;
  optional?: boolean;
  probes?: ProbeSpec[];
  byMoment?: Record<string, ProbeSpec[]>;
  result?: { probes: ProbeSpec[] };
}

/** One `golden/*.screenshots.json` entry: expectations for the bundles it names. */
export interface ScreenshotSpec {
  /** `[<run>/]<test>`: the test's directory in the QA Report of the run named, else of the main run. */
  bundleDirs: string[];
  viewport: { width: number; height: number };
  minBytes: number;
  /** Per-channel margin of the image snapshots, for JPEG frames. */
  tolerance?: number;
  resultsListed?: boolean;
  highlights?: (string[] | null)[];
  steps: StepSpec[];
}

/** The default per-channel margin of the image snapshots. */
export const TOLERANCE = 8;

/** Read when the tests are defined, so each bundle is a test of its own. */
export function readScreenshotSpecs(name: string): ScreenshotSpec[] {
  const file = path.join(root, 'golden', `${name}.screenshots.json`);
  return [JSON.parse(readFileSync(file, 'utf8')) as ScreenshotSpec].flat();
}

/** A test's directory in its QA Report, from `[<run>/]<test>`. */
export function bundleDirOf(bundleDirName: string): string {
  const run = path.posix.dirname(bundleDirName);
  return path.join(
    root,
    reportOf(run === '.' ? '' : run),
    path.posix.basename(bundleDirName),
  );
}

export async function readBundle(dir: string): Promise<Bundle> {
  return JSON.parse(await readFile(path.join(dir, 'bundle.json'), 'utf8'));
}

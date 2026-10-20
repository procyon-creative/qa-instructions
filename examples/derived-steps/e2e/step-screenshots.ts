import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect } from '@playwright/test';
import {
  ProbeSheet,
  Rgb,
  type Bundle,
  type BundleStep,
} from '@qa-instructions/e2e-kit';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

import { ProbePoints, type ProbeSpec } from './probe-points.ts';
import {
  TOLERANCE,
  bundleDirOf,
  readBundle,
  type ScreenshotSpec,
  type StepSpec,
} from './screenshot-specs.ts';

/**
 * pixelmatch's `threshold` for a per-channel margin: its YIQ distance for a
 * shift of the same size in every channel is at most about 0.004 per level.
 */
const THRESHOLD_PER_LEVEL = 0.004;

/**
 * One test's Step and Result Screenshots against the expectations of a
 * `golden/*.screenshots.json`: one screenshot per QA Step, taken at the
 * expected moment, carrying the Highlight marks it should, and whose probe
 * points (see ProbeSheet) match their image snapshots.
 */
export class StepScreenshots {
  private readonly spec: ScreenshotSpec;
  private readonly bundleDirName: string;
  private readonly dir: string;
  private bundle!: Bundle;

  /** `bundleDirName` is `[<run>/]<test>`. */
  constructor(spec: ScreenshotSpec, bundleDirName: string) {
    this.spec = spec;
    this.bundleDirName = bundleDirName;
    this.dir = bundleDirOf(bundleDirName);
  }

  async verify(): Promise<void> {
    this.bundle = await readBundle(this.dir);
    this.verifyHighlights();

    // Steps listed by `index` are spot checks; otherwise every step is listed.
    const spotChecks = this.spec.steps.every((s) => s.index !== undefined);
    if (!spotChecks) {
      expect(this.bundle.steps, `${this.bundleDirName}: QA Steps`).toHaveLength(
        this.spec.steps.length,
      );
    }
    for (const [i, expected] of this.spec.steps.entries()) {
      const index = expected.index ?? i + 1;
      const step = this.bundle.steps[index - 1];
      expect(
        step,
        `${this.bundleDirName} step ${index}: missing`,
      ).toBeDefined();
      await this.verifyStep(step, index, expected);
    }
  }

  private verifyHighlights(): void {
    if (!this.spec.highlights) return;
    const actual = this.bundle.steps.map(
      (step) => this.bundle.assets[step.assetIds?.[0] ?? '']?.highlight ?? null,
    );
    expect(actual, `${this.bundleDirName}: Highlights`).toEqual(
      this.spec.highlights,
    );
  }

  private async verifyStep(
    step: BundleStep,
    index: number,
    expected: StepSpec,
  ): Promise<void> {
    const label = `${this.bundleDirName} step ${index}`;
    if (expected.action !== undefined) {
      expect(fixtureOrigin.canonicalize(step.action), `${label}: action`).toBe(
        expected.action,
      );
    }
    if (!step.assetIds?.length && expected.optional) return;
    expect(step.assetIds, `${label}: Step Screenshots`).toHaveLength(1);

    // `byMoment` gives probes for each moment the screenshot may be taken
    // at, when that depends on the screen recording's timing.
    const moment = step.screenshotMoment ?? '';
    if (expected.byMoment) {
      expect(Object.keys(expected.byMoment), `${label}: moment`).toContain(
        moment,
      );
    } else if (expected.moment !== undefined) {
      expect(moment, `${label}: moment`).toBe(expected.moment);
    }
    const probes = expected.byMoment
      ? expected.byMoment[moment]
      : expected.probes;
    const name = `step-${String(index).padStart(2, '0')}${expected.byMoment ? `-${moment}` : ''}`;
    await this.verifyImage(label, name, step, step.assetIds![0], probes ?? []);

    if (this.spec.resultsListed)
      await this.verifyResult(label, name, step, expected);
  }

  /**
   * A step's Result Screenshot, where the spec lists results: present, with
   * no Highlight and its probe points matching, only on the steps given a
   * `result`.
   */
  private async verifyResult(
    label: string,
    name: string,
    step: BundleStep,
    expected: StepSpec,
  ): Promise<void> {
    if (!expected.result) {
      expect(step.resultAssetId, `${label}: Result Screenshot`).toBeUndefined();
      return;
    }
    const asset = this.bundle.assets[step.resultAssetId ?? ''];
    expect(asset, `${label}: Result Screenshot`).toBeDefined();
    expect(
      asset.highlight,
      `${label}: Result Screenshot highlight`,
    ).toBeUndefined();
    await this.verifyImage(
      `${label} result`,
      `${name}-result`,
      step,
      step.resultAssetId!,
      expected.result.probes,
    );
  }

  /**
   * Checks a screenshot's size and snapshots its probe points. A screen
   * recording frame (JPEG) drifts in color, so its snapshots allow the
   * spec's `tolerance` per channel.
   */
  private async verifyImage(
    label: string,
    name: string,
    step: BundleStep,
    assetId: string,
    probes: ProbeSpec[],
  ): Promise<void> {
    const asset = this.bundle.assets[assetId];
    const data = await readFile(path.join(this.dir, 'assets', asset.filename));
    expect(data.length, `${label}: screenshot bytes`).toBeGreaterThanOrEqual(
      this.spec.minBytes,
    );

    // A high-DPI screenshot may be a whole multiple of the viewport.
    const { width, height } = await Rgb.decode(data);
    const scale = width / this.spec.viewport.width;
    expect(
      Number.isInteger(scale),
      `${label}: screenshot is ${width}x${height}`,
    ).toBe(true);
    expect(height, `${label}: screenshot height`).toBe(
      this.spec.viewport.height * scale,
    );

    const geometry = new ProbePoints(step, scale);
    const points = probes.map((probe) => {
      const point = geometry.of(probe);
      expect(
        point,
        `${label}: no element box or click point for probe "${probe.name}"`,
      ).toBeDefined();
      return point!;
    });
    if (points.length === 0) return;
    const sheet = await ProbeSheet.png(data, points, scale);
    expect(sheet, label).toMatchSnapshot(
      ['screenshots', ...this.bundleDirName.split('/'), `${name}.png`],
      {
        threshold: THRESHOLD_PER_LEVEL * (this.spec.tolerance ?? TOLERANCE),
        maxDiffPixels: 0,
      },
    );
  }
}

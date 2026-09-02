import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import {
  bundleDirName,
  writeBundle,
  type QaAssetInput,
  type QaRunBundle,
} from '@qa-instructions/core';

type CollectorOptions = {
  outputDir?: string;
};

function collectAssets(
  result: TestResult,
  bundle: QaRunBundle,
): QaAssetInput[] {
  const screenshots: Buffer[] = [];

  for (const step of result.steps) {
    if (step.category !== 'test.step') continue;
    for (const attachment of step.attachments ?? []) {
      if (attachment.name !== 'qa-screenshot' || !attachment.body) continue;
      screenshots.push(Buffer.from(attachment.body));
    }
  }

  const declaredIds = bundle.steps.flatMap((step) => step.assetIds ?? []);
  const assets: QaAssetInput[] = [];

  for (let i = 0; i < screenshots.length; i += 1) {
    const assetId =
      declaredIds[i] ?? `step-${String(i + 1).padStart(2, '0')}-screenshot`;
    assets.push({
      id: assetId,
      contentType: 'image/png',
      filename: `${assetId}.png`,
      data: screenshots[i],
    });
  }

  return assets;
}

export default class QaCollectorReporter implements Reporter {
  private outputDir: string;

  constructor(_config: FullConfig, options: CollectorOptions = {}) {
    this.outputDir = options.outputDir ?? 'qa-runs';
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const bundleAttachment = [...result.attachments]
      .reverse()
      .find((a) => a.name === 'qa-run-bundle' && a.body);

    if (!bundleAttachment?.body) return;

    const bundle = JSON.parse(
      bundleAttachment.body.toString('utf8'),
    ) as QaRunBundle;

    const assets = collectAssets(result, bundle);
    const bundleWithAssets: QaRunBundle = {
      ...bundle,
      assets: Object.fromEntries(
        assets.map((asset) => [
          asset.id,
          {
            id: asset.id,
            contentType: asset.contentType,
            filename: asset.filename,
          },
        ]),
      ),
    };

    const dir = path.join(
      this.outputDir,
      bundleDirName(test.location.file, test.title),
    );
    await mkdir(dir, { recursive: true });
    await writeBundle(dir, bundleWithAssets, assets);
  }
}

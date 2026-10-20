import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect } from '@playwright/test';

import { root } from './reports.ts';
import { readBundle } from './screenshot-specs.ts';

/** The images a rendered page shows, in order: embedded (HTML) or linked (Markdown). */
async function shownImages(
  rendered: string,
  content: string,
): Promise<Buffer[]> {
  if (rendered.endsWith('.html')) {
    return [...content.matchAll(/src="data:image\/png;base64,([^"]+)"/g)].map(
      ([, base64]) => Buffer.from(base64, 'base64'),
    );
  }
  const dir = path.dirname(path.join(root, rendered));
  return Promise.all(
    [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(([, link]) =>
      readFile(path.join(dir, decodeURIComponent(link))),
    ),
  );
}

/**
 * Each image a rendered page shows must be the Step Screenshot of its step,
 * then its Result Screenshot if any, in step order.
 */
export async function expectStepImages(
  rendered: string,
  bundleDir: string,
  content: string,
): Promise<void> {
  const dir = path.join(root, bundleDir);
  const bundle = await readBundle(dir);
  const expected = await Promise.all(
    bundle.steps
      .flatMap((step) => [step.assetIds?.[0], step.resultAssetId])
      .filter((id): id is string => id !== undefined)
      .map((id) =>
        readFile(path.join(dir, 'assets', bundle.assets[id].filename)),
      ),
  );
  const actual = await shownImages(rendered, content);
  expect(actual, `${rendered}: images shown`).toHaveLength(expected.length);
  actual.forEach((image, i) => {
    expect(
      image.equals(expected[i]),
      `${rendered}: image ${i + 1} is its step's screenshot`,
    ).toBe(true);
  });
}

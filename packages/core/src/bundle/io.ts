import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { QaAssetInput, QaRunBundle } from '../model.js';

const BUNDLE_FILENAME = 'bundle.json';
const ASSETS_DIR = 'assets';

export async function writeBundle(
  dir: string,
  bundle: QaRunBundle,
  assetData: QaAssetInput[],
): Promise<void> {
  await mkdir(path.join(dir, ASSETS_DIR), { recursive: true });

  for (const asset of assetData) {
    await writeFile(path.join(dir, ASSETS_DIR, asset.filename), asset.data);
  }

  await writeFile(
    path.join(dir, BUNDLE_FILENAME),
    JSON.stringify(bundle, null, 2),
    'utf8',
  );
}

export async function readBundle(dir: string): Promise<QaRunBundle> {
  const raw = await readFile(path.join(dir, BUNDLE_FILENAME), 'utf8');
  return JSON.parse(raw) as QaRunBundle;
}

export function bundleDirName(testFile: string, testTitle: string): string {
  let base = path.basename(testFile, path.extname(testFile));
  if (base.endsWith('.spec')) {
    base = base.slice(0, -'.spec'.length);
  }
  const slug = testTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}--${slug}`;
}

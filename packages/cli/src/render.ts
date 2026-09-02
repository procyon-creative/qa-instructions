import { mkdir, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { readBundle, render, type RenderFormat } from '@qa-instructions/core';

export async function isBundleDir(dir: string): Promise<boolean> {
  try {
    await stat(path.join(dir, 'bundle.json'));
    return true;
  } catch {
    return false;
  }
}

export async function findBundles(root: string): Promise<string[]> {
  if (await isBundleDir(root)) return [root];

  const entries = await readdir(root, { withFileTypes: true });
  const bundles: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name);
    if (await isBundleDir(candidate)) bundles.push(candidate);
  }

  return bundles.sort();
}

function outputFilename(bundleDir: string, format: RenderFormat): string {
  const base = path.basename(bundleDir);
  return format === 'json' ? `${base}.json` : `${base}.txt`;
}

export async function renderAll(
  bundles: string[],
  format: RenderFormat,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });

  for (const bundleDir of bundles) {
    const bundle = await readBundle(bundleDir);
    const content = render(bundle, format);
    const filename = outputFilename(bundleDir, format);
    await writeFile(path.join(outDir, filename), content, 'utf8');
  }
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const goldenDir = path.join(root, 'golden');

function normalizeBundle(raw) {
  const bundle = structuredClone(raw);
  delete bundle.meta.capturedAt;
  for (const step of bundle.steps) {
    if (step.url) {
      step.url = step.url.replace(/^https?:\/\/[^/]+/, 'http://127.0.0.1:4321');
    }
  }
  return bundle;
}

async function probePixel(pngPath, x, y) {
  const buffer = await readFile(pngPath);
  const png = PNG.sync.read(buffer);
  const idx = (png.width * y + x) * 4;
  return { r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2] };
}

const bundleDirName = 'capture--login-error-flow';
const bundleDir = path.join(root, 'qa-runs', bundleDirName);
const bundle = normalizeBundle(
  JSON.parse(await readFile(path.join(bundleDir, 'bundle.json'), 'utf8')),
);

await mkdir(goldenDir, { recursive: true });
await writeFile(
  path.join(goldenDir, 'bundle.json'),
  `${JSON.stringify(bundle, null, 2)}\n`,
);

const qaSteps = await readFile(
  path.join(root, 'qa-steps-out', `${bundleDirName}.txt`),
  'utf8',
);
await writeFile(path.join(goldenDir, 'qa-steps.txt'), qaSteps);

const probes = [
  { file: 'step-01-screenshot.png', x: 400, y: 140 },
  { file: 'step-02-screenshot.png', x: 400, y: 140 },
  { file: 'step-03-screenshot.png', x: 400, y: 159 },
];

const assets = {};
for (const { file, x, y } of probes) {
  const assetPath = path.join(bundleDir, 'assets', file);
  const color = await probePixel(assetPath, x, y);
  assets[file] = {
    minBytes: 10_000,
    probe: { x, y, ...color },
  };
}

const manifest = {
  bundleDir: bundleDirName,
  steps: bundle.steps.length,
  assets,
};

await writeFile(
  path.join(goldenDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`update-goldens: wrote ${goldenDir}`);

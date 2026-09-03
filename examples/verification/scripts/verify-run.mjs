import { readFile, stat } from 'node:fs/promises';
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function probePixel(pngPath, probe) {
  const buffer = await readFile(pngPath);
  const png = PNG.sync.read(buffer);
  const idx = (png.width * probe.y + probe.x) * 4;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
  };
}

function colorClose(actual, expected, tolerance = 8) {
  return (
    Math.abs(actual.r - expected.r) <= tolerance &&
    Math.abs(actual.g - expected.g) <= tolerance &&
    Math.abs(actual.b - expected.b) <= tolerance
  );
}

function fail(message) {
  console.error(`verify-run: ${message}`);
  process.exitCode = 1;
}

const manifest = await readJson(path.join(goldenDir, 'manifest.json'));
const bundleDir = path.join(root, 'qa-runs', manifest.bundleDir);
const qaStepsPath = path.join(
  root,
  'qa-steps-out',
  `${manifest.bundleDir}.txt`,
);

try {
  await stat(bundleDir);
} catch {
  fail(`missing bundle directory: ${bundleDir}`);
  process.exit(1);
}

const bundle = normalizeBundle(
  await readJson(path.join(bundleDir, 'bundle.json')),
);
const goldenBundle = normalizeBundle(
  await readJson(path.join(goldenDir, 'bundle.json')),
);

if (JSON.stringify(bundle) !== JSON.stringify(goldenBundle)) {
  fail(
    'bundle.json does not match golden (after normalizing capturedAt and host)',
  );
  console.error('expected:', JSON.stringify(goldenBundle, null, 2));
  console.error('actual:', JSON.stringify(bundle, null, 2));
}

try {
  const qaSteps = await readFile(qaStepsPath, 'utf8');
  const goldenSteps = await readFile(
    path.join(goldenDir, 'qa-steps.txt'),
    'utf8',
  );
  if (qaSteps !== goldenSteps) {
    fail('qa-steps.txt does not match golden');
    console.error('--- expected ---');
    console.error(goldenSteps);
    console.error('--- actual ---');
    console.error(qaSteps);
  }
} catch (error) {
  fail(`qa-steps output missing or unreadable: ${error.message}`);
}

for (const [filename, spec] of Object.entries(manifest.assets)) {
  const assetPath = path.join(bundleDir, 'assets', filename);
  let size = 0;
  try {
    size = (await stat(assetPath)).size;
  } catch {
    fail(`missing screenshot: ${assetPath}`);
    continue;
  }

  if (size < spec.minBytes) {
    fail(`${filename} is too small (${size} < ${spec.minBytes} bytes)`);
  }

  const actual = await probePixel(assetPath, spec.probe);
  if (!colorClose(actual, spec.probe, spec.tolerance ?? 8)) {
    fail(
      `${filename} probe at (${spec.probe.x},${spec.probe.y}) expected rgb(${spec.probe.r},${spec.probe.g},${spec.probe.b}) got rgb(${actual.r},${actual.g},${actual.b})`,
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`verify-run: ok (${manifest.bundleDir})`);

import { copyFile, mkdir, writeFile } from 'node:fs/promises';

import {
  BUNDLE,
  INDEX,
  QA_STEPS,
  goldenDir,
  readNormalizedBundle,
  readRenderedQaSteps,
} from './goldens.mjs';

await mkdir(goldenDir, { recursive: true });

const bundle = await readNormalizedBundle(BUNDLE.collected);
await writeFile(BUNDLE.golden, `${JSON.stringify(bundle, null, 2)}\n`);
await writeFile(QA_STEPS.golden, await readRenderedQaSteps());
await copyFile(INDEX.rendered, INDEX.golden);

console.log(`update-goldens: wrote ${goldenDir}`);

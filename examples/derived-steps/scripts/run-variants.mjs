import { spawnSync } from 'node:child_process';

import { root } from './goldens.mjs';
import { VARIANTS } from './variants.mjs';

// Runs every variant in scripts/variants.mjs, one Playwright run each, and
// fails if any run fails.

for (const name of Object.keys(VARIANTS)) {
  console.log(`run-variants: ${name}`);
  const run = spawnSync(
    'pnpm',
    ['exec', 'playwright', 'test', '-c', 'playwright.variants.config.ts'],
    { cwd: root, env: { ...process.env, QA_VARIANT: name }, stdio: 'inherit' },
  );
  if (run.status !== 0) {
    console.error(`run-variants: the ${name} run exited ${run.status}`);
    process.exit(1);
  }
}
console.log(`run-variants: ok (${Object.keys(VARIANTS).length} runs)`);

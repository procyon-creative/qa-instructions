import { defineConfig } from '@playwright/test';

import base, { mask } from './playwright.config';
import { VARIANTS } from './scripts/variants.mjs';

// One variant of the main run, named by QA_VARIANT (see scripts/variants.mjs;
// scripts/run-variants.mjs runs them all). Its own outputDir puts its QA
// Report in test-results/<variant>/qa-report/, apart from the main run's.
const name = process.env.QA_VARIANT ?? '';
const variant = VARIANTS[name as keyof typeof VARIANTS];
if (!variant) {
  throw new Error(
    `Set QA_VARIANT to one of: ${Object.keys(VARIANTS).join(', ')}`,
  );
}

export default defineConfig(base, {
  testMatch: variant.testMatch,
  outputDir: `test-results/${name}`,
  reporter: [
    ['list'],
    [
      '@procyon-creative/qa-instructions/playwright',
      { mask, open: 'never', ...variant.options },
    ],
  ],
});

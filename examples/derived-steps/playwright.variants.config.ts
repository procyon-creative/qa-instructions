import { defineConfig } from '@playwright/test';

import base, { mask } from './playwright.config.ts';
import { VARIANTS } from './e2e/variants.ts';

// One variant of the main run, named by QA_VARIANT (see e2e/variants.ts;
// the e2e `runs` project runs them all). Its own outputDir puts its QA
// Report in test-results/<variant>/qa-report/, apart from the main run's.
const name = process.env.QA_VARIANT ?? '';
const variant = VARIANTS[name];
if (!variant) {
  throw new Error(
    `Set QA_VARIANT to one of: ${Object.keys(VARIANTS).join(', ')}`,
  );
}

export default defineConfig(base, {
  testMatch: variant.testMatch,
  outputDir: `test-results/${name}`,
  use: { ...base.use, ...variant.use },
  reporter: [
    ['list'],
    [
      '@procyon-creative/qa-instructions/playwright',
      { mask, open: 'never', ...variant.options },
    ],
  ],
});

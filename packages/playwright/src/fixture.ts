import { test as base, type TestInfo } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  createBundleBuilder,
  type BundleBuilder,
  type QaGuideOptions,
} from '@qa-instructions/core';

export type QaFixture = {
  guide(options: QaGuideOptions): void;
  step(
    action: string,
    expected: string | undefined,
    fn: () => Promise<void>,
  ): Promise<void>;
};

function createQaFixture(
  page: Page,
  testInfo: TestInfo,
  builder: BundleBuilder,
): QaFixture {
  let stepCounter = 0;

  builder.setSource({
    runner: 'playwright',
    testFile: testInfo.file,
    testTitle: testInfo.title,
    project: testInfo.project.name,
  });

  return {
    guide(options) {
      builder.guide(options);
    },

    async step(action, expected, fn) {
      stepCounter += 1;
      const assetId = `step-${String(stepCounter).padStart(2, '0')}-screenshot`;

      await base.step(action, async (step) => {
        try {
          await fn();
          const screenshot = await page.screenshot();
          await step.attach('qa-screenshot', {
            body: screenshot,
            contentType: 'image/png',
          });
          builder.addStep({
            action,
            expected,
            url: page.url(),
            assetIds: [assetId],
          });
        } catch (error) {
          builder.setStatus('partial');
          throw error;
        }
      });
    },
  };
}

export const test = base.extend<{ qa: QaFixture }>({
  qa: async ({ page }, use, testInfo) => {
    const builder = createBundleBuilder();
    const qa = createQaFixture(page, testInfo, builder);
    await use(qa);

    await testInfo.attach('qa-run-bundle', {
      body: Buffer.from(JSON.stringify(builder.toBundle())),
      contentType: 'application/json',
    });
  },
});

export { expect } from '@playwright/test';

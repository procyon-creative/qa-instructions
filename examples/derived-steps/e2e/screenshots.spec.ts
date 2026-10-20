import { test } from '@playwright/test';

import { SCREENSHOT_GOLDENS } from './reports.ts';
import { readScreenshotSpecs } from './screenshot-specs.ts';
import { StepScreenshots } from './step-screenshots.ts';

// Each test's Step and Result Screenshots: the moment, the Highlight marks,
// and the pixels at the probe points, against the specs and image snapshots
// in ./golden.
for (const name of SCREENSHOT_GOLDENS) {
  for (const spec of readScreenshotSpecs(name)) {
    for (const bundleDir of spec.bundleDirs) {
      test(`${bundleDir} has the screenshots of golden/${name}`, async () => {
        await new StepScreenshots(spec, bundleDir).verify();
      });
    }
  }
}

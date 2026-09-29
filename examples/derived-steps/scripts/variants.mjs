/** One run per Highlight style, for the moving-UI test only. */
const HIGHLIGHT_STYLES = ['outline', 'clickDot', 'badge', 'spotlight', 'none'];

/**
 * Runs of the derived-steps tests with other reporter options, by name. A
 * run writes one QA Report, in `qa-report/` inside its Playwright
 * `outputDir`, so each variant is its own run with `outputDir`
 * `test-results/<name>/` (playwright.variants.config.ts), and its QA Report
 * lands in `test-results/<name>/qa-report/`.
 */
export const VARIANTS = {
  // The other presentations of test.step groups.
  collapse: {
    testMatch: ['sign-in.spec.ts', 'grouped.spec.ts'],
    options: { testSteps: 'collapse' },
  },
  ignore: {
    testMatch: ['sign-in.spec.ts', 'grouped.spec.ts'],
    options: { testSteps: 'ignore' },
  },
  // A Result Screenshot on a middle step too, chosen by its text; the last
  // step keeps its own by default.
  'result-override': {
    testMatch: 'sign-in.spec.ts',
    options: {
      resultScreenshots: {
        overrides: [{ match: 'Click the Sign in link', screenshots: 'both' }],
      },
    },
  },
  ...Object.fromEntries(
    HIGHLIGHT_STYLES.map((highlight) => [
      `styles/${highlight}`,
      { testMatch: 'moving-ui.spec.ts', options: { highlight } },
    ]),
  ),
};

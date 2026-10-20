/** The QA Site the `qa-site` variant sets, as a tester would see it. */
export const QA_SITE = 'https://multidev.example.com';

/** One run per Highlight style, for the moving-UI test only. */
const HIGHLIGHT_STYLES = ['outline', 'clickDot', 'badge', 'spotlight', 'none'];

/** One variant: what differs from the main run. */
export interface Variant {
  testMatch: string | string[];
  /** Reporter options. */
  options?: Record<string, unknown>;
  /** Playwright `use` options. */
  use?: Record<string, unknown>;
  /** Environment for the run. */
  env?: Record<string, string>;
}

/**
 * Runs of the derived-steps tests with other reporter options (or, with
 * `use`, other Playwright options), by name. A
 * run writes one QA Report, in `qa-report/` inside its Playwright
 * `outputDir`, so each variant is its own run with `outputDir`
 * `test-results/<name>/` (playwright.variants.config.ts), and its QA Report
 * lands in `test-results/<name>/qa-report/`. The e2e `runs` project makes
 * every one (e2e/runs.setup.ts).
 */
export const VARIANTS: Record<string, Variant> = {
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
  // Plain `trace: 'on'`, without per-action screenshots: Step Screenshots
  // come from the trace's screen recording, as before 1.63.
  'trace-on': {
    testMatch: 'sign-in.spec.ts',
    use: { trace: 'on' },
  },
  // QA_SITE set for the run: every fixture-site address in the pages and
  // Jira text points at the QA Site. The saved data keeps the original ones.
  'qa-site': {
    testMatch: 'sign-in.spec.ts',
    env: { QA_SITE },
  },
  ...Object.fromEntries(
    HIGHLIGHT_STYLES.map((highlight): [string, Variant] => [
      `styles/${highlight}`,
      { testMatch: 'moving-ui.spec.ts', options: { highlight } },
    ]),
  ),
};

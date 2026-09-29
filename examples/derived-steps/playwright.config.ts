import { defineConfig } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

const baseURL = fixtureOrigin.url;

// Secrets beyond password fields to keep out of QA Instructions: here, the
// test accounts' email addresses.
const mask = [/[\w.+-]+@qa\.example\.com/];

// Never open the QA Report in a browser, even when a test fails: scripts
// check this run. playwright.failing.config.ts keeps the default to check
// that a CI run opens nothing.
const open = 'never';

/** One reporter per Highlight style, for the moving-UI test only. */
const highlightStyles = [
  'outline',
  'clickDot',
  'badge',
  'spotlight',
  'none',
] as const;

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    // The QA Report in qa-report/ (the default folder), with the default
    // presentation of test.step groups: Sections. Markdown is added so its
    // goldens are checked too.
    [
      '@procyon-creative/qa-instructions/playwright',
      { mask, open, formats: ['markdown'] },
    ],
    [
      '@procyon-creative/qa-instructions/playwright',
      { outputFolder: 'qa-report/collapse', testSteps: 'collapse', mask, open },
    ],
    [
      '@procyon-creative/qa-instructions/playwright',
      { outputFolder: 'qa-report/ignore', testSteps: 'ignore', mask, open },
    ],
    // A Result Screenshot on a middle step too, chosen by its text; the last
    // step keeps its own by default.
    [
      '@procyon-creative/qa-instructions/playwright',
      {
        outputFolder: 'qa-report/result-override',
        open,
        select: { files: ['sign-in.spec.ts'] },
        resultScreenshots: {
          overrides: [{ match: 'Click the Sign in link', screenshots: 'both' }],
        },
      },
    ],
    ...highlightStyles.map(
      (highlight) =>
        [
          '@procyon-creative/qa-instructions/playwright',
          {
            outputFolder: `qa-report/styles/${highlight}`,
            highlight,
            open,
            select: { files: ['moving-ui.spec.ts'] },
          },
        ] as const,
    ),
  ],
  use: {
    baseURL,
    viewport: { width: 800, height: 600 },
    // Step Screenshots: one screen snapshot per action (Playwright 1.63+).
    // DOM snapshots let the reporter recognize password fields and name
    // elements found by test id or CSS selector.
    trace: { mode: 'on', snapshots: { screen: true, dom: true } },
  },
  webServer: {
    command: 'pnpm --filter @qa-instructions/fixture-site dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

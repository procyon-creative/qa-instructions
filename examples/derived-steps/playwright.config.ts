import { defineConfig } from '@playwright/test';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

const baseURL = fixtureOrigin.url;

// Secrets beyond password fields to keep out of QA Instructions: here, the
// test accounts' email addresses.
const mask = [/[\w.+-]+@qa\.example\.com/];

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
      { mask, formats: ['markdown'] },
    ],
    [
      '@procyon-creative/qa-instructions/playwright',
      { outputFolder: 'qa-report/collapse', testSteps: 'collapse', mask },
    ],
    [
      '@procyon-creative/qa-instructions/playwright',
      { outputFolder: 'qa-report/ignore', testSteps: 'ignore', mask },
    ],
    ...highlightStyles.map(
      (highlight) =>
        [
          '@procyon-creative/qa-instructions/playwright',
          {
            outputFolder: `qa-report/styles/${highlight}`,
            highlight,
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

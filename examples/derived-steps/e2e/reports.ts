import path from 'node:path';

import { RunLog } from '@qa-instructions/e2e-kit';
import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

/** The example's directory. */
export const root = path.join(import.meta.dirname, '..');

/** What each sample run ended with (written by e2e/runs.setup.ts). */
export const runLog = new RunLog(path.join(root, 'e2e-results', 'runs'));

/**
 * The QA Report a run writes: `qa-report/` inside the run's Playwright
 * `outputDir`, `test-results[/<run>]/`. `run` is empty for the main run,
 * which keeps Playwright's default `outputDir`.
 */
export function reportOf(run = ''): string {
  return path.posix.join('test-results', run, 'qa-report');
}

/** The QA Report the main run writes. */
export const REPORT = reportOf();

/**
 * A file a run wrote into a test's directory of its QA Report:
 * `test-results[/<run>]/qa-report/<test>/qa-steps.<ext>`. No render step runs.
 */
function reported(test: string, ext: string, run = ''): string {
  return path.posix.join(reportOf(run), test, `qa-steps.${ext}`);
}

/**
 * A QA Report file and the golden it must equal. Goldens are Playwright
 * snapshots, named by their path in `./golden`. A `bundleDir` is the test's
 * directory in the QA Report, whose images the page or Markdown must show.
 */
export interface Golden {
  rendered: string;
  snapshot: string;
  bundleDir?: string;
}

/** Jira-ready text in the main QA Report, and the golden it must equal. */
function text(test: string): Golden {
  return { rendered: reported(test, 'txt'), snapshot: `${test}.txt` };
}

/** QA Report files and the golden each must equal. */
export const GOLDENS: Golden[] = [
  text('sign-in--sign-in-with-bad-credentials'),
  // A test with no groups reads the same under every test.step presentation.
  ...['collapse', 'ignore'].map((folder) => ({
    rendered: reported('sign-in--sign-in-with-bad-credentials', 'txt', folder),
    snapshot: 'sign-in--sign-in-with-bad-credentials.txt',
  })),
  // One golden per test.step presentation: sections (default), collapse, ignore.
  text('grouped--sign-in-with-good-credentials'),
  ...['collapse', 'ignore'].map((folder) => ({
    rendered: reported('grouped--sign-in-with-good-credentials', 'txt', folder),
    snapshot: `${folder}/grouped--sign-in-with-good-credentials.txt`,
  })),
  // Deliberately failing tests, run with retries (playwright.failing.config.ts).
  ...[
    'failing--sign-in-shows-the-wrong-user',
    'failing--sign-in-with-a-missing-link',
    'failing--setup-fails-before-any-step',
    'failing--flaky-sign-in-passes-on-retry',
    'failing--sign-in-despite-failed-soft-checks',
  ].map((name) => ({
    rendered: reported(name, 'txt', 'failing'),
    snapshot: `failing/${name}.txt`,
  })),
  // A password field and a configured mask pattern: both masked.
  text('login--sign-in-with-a-password'),
  // A key press with a checked effect: Tab moves focus to Password.
  text('keyboard--move-from-username-to-password-with-tab'),
  text('scripted-page--read-the-faq'),
  // The FAQ's script, on a page it changes nothing on: no warning.
  text('scripted-page--open-collapsed-sections-on-a-page-without-any'),
  text('scripted-page--subscribe-to-the-newsletter'),
  // Each test's page (HTML) and Markdown for tests covering screenshots,
  // warning steps, nested Sections, an approximate step, and an incomplete
  // (failed) test.
  ...(
    [
      ['', 'sign-in--sign-in-with-bad-credentials'],
      ['', 'scripted-page--read-the-faq'],
      ['', 'grouped--sign-in-with-good-credentials'],
      ['', 'scripted-page--subscribe-to-the-newsletter'],
      ['failing', 'failing--sign-in-shows-the-wrong-user'],
    ] as const
  ).flatMap(([folder, name]) =>
    ['md', 'html'].map((ext) => ({
      rendered: reported(name, ext, folder),
      snapshot: `${path.posix.join(folder, name)}.${ext}`,
      bundleDir: path.posix.join(reportOf(folder), name),
    })),
  ),
  // QA_SITE set (the qa-site variant): the page and Jira text point at the QA Site.
  {
    rendered: reported(
      'sign-in--sign-in-with-bad-credentials',
      'txt',
      'qa-site',
    ),
    snapshot: 'qa-site/sign-in--sign-in-with-bad-credentials.txt',
  },
  {
    rendered: reported(
      'sign-in--sign-in-with-bad-credentials',
      'html',
      'qa-site',
    ),
    snapshot: 'qa-site/sign-in--sign-in-with-bad-credentials.html',
    bundleDir: path.posix.join(
      reportOf('qa-site'),
      'sign-in--sign-in-with-bad-credentials',
    ),
  },
  text('moving-ui--register-a-warranty-from-the-menu'),
  // Checks with the author's messages, on values read into variables.
  text('cart--add-credits-to-the-cart'),
  // A field and button far below the fold: Playwright scrolls to each.
  text('long-page--order-boots-from-the-bottom-of-the-page'),
  // A form below the fold on a smoothly scrolling page.
  text('long-page--order-gift-cards-on-a-smoothly-scrolling-page'),
  // Elements found by CSS selector and test id, named as the page shows them.
  text('certificates--add-three-recs-to-the-cart'),
  // Each QA Report's index: every test, its status, and its links.
  { rendered: `${REPORT}/index.html`, snapshot: 'index.html' },
  {
    rendered: `${reportOf('failing')}/index.html`,
    snapshot: 'failing/index.html',
  },
];

/** QA Report folders whose index links must all lead to files. */
export const REPORT_FOLDERS = [
  REPORT,
  reportOf('failing'),
  reportOf('result-override'),
];

const DATA_URI = /data:image\/png;base64,[A-Za-z0-9+/=]+/g;

/**
 * Rendered output as its golden stores it. Goldens name the fixture site on
 * its canonical port, whatever FIXTURE_PORT the run used. Screenshot bytes can
 * differ between machines, so HTML goldens keep a placeholder for each
 * embedded image; the images themselves are checked against the bundle's
 * assets instead.
 */
export function normalizeRendered(file: string, content: string): string {
  const canonical = fixtureOrigin.canonicalize(content);
  return file.endsWith('.html')
    ? canonical.replace(DATA_URI, 'data:image/png;base64,…')
    : canonical;
}

/**
 * What tests/login.spec.ts types: into a password field, and a value matching
 * the config's `mask` pattern. Neither may appear in any file written under
 * these directories.
 */
export const SECRETS = [
  'correct-horse-battery-staple',
  'tester@qa.example.com',
];
export const OUTPUT_DIRS = [REPORT];

/**
 * Expectations for each bundle's Step Screenshots, in JSON files in
 * ./golden: one per QA Step, taken at the expected moment, with the
 * Highlight marks it should carry and the probe points whose pixels the
 * image snapshots keep (see e2e/probe-points.ts). Where a golden sets
 * `resultsListed`, only the steps given a `result` have a Result Screenshot,
 * unhighlighted, with its own probe points. Where the moment depends on the
 * screen recording's timing, a step lists probes `byMoment`; an `optional`
 * step may have no Step Screenshot; `tolerance` widens the snapshots'
 * per-channel margin for JPEG frames.
 */
export const SCREENSHOT_GOLDENS = [
  'sign-in--sign-in-with-bad-credentials',
  // resultScreenshots overrides: a middle step gets one too.
  'sign-in--result-override',
  'scripted-page--subscribe-to-the-newsletter',
  'moving-ui--register-a-warranty-from-the-menu',
  'moving-ui--highlight-styles',
  'long-page--order-boots-from-the-bottom-of-the-page',
  // Plain `trace: 'on'`: screen recording frames, each of its step's page.
  'sign-in--trace-on',
];

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixtureOrigin } from '@qa-instructions/fixture-site/origin';

export const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** The QA Report the main run writes, in the reporter's default folder. */
export const REPORT = 'qa-report';

/**
 * A file the run wrote into a test's directory of a QA Report:
 * `qa-report[/<folder>]/<test>/qa-steps.<ext>`. No render step runs.
 */
function reported(test, ext, folder = '') {
  return path.posix.join(REPORT, folder, test, `qa-steps.${ext}`);
}

/** Jira-ready text in the main QA Report, and the golden it must equal. */
function text(test) {
  return { rendered: reported(test, 'txt'), golden: `golden/${test}.txt` };
}

/** QA Report files and the golden file each must equal. */
export const GOLDENS = [
  text('sign-in--sign-in-with-bad-credentials'),
  // A test with no groups reads the same under every test.step presentation.
  ...['collapse', 'ignore'].map((folder) => ({
    rendered: reported('sign-in--sign-in-with-bad-credentials', 'txt', folder),
    golden: 'golden/sign-in--sign-in-with-bad-credentials.txt',
  })),
  // One golden per test.step presentation: sections (default), collapse, ignore.
  text('grouped--sign-in-with-good-credentials'),
  ...['collapse', 'ignore'].map((folder) => ({
    rendered: reported('grouped--sign-in-with-good-credentials', 'txt', folder),
    golden: `golden/${folder}/grouped--sign-in-with-good-credentials.txt`,
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
    golden: `golden/failing/${name}.txt`,
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
  ...[
    ['', 'sign-in--sign-in-with-bad-credentials'],
    ['', 'scripted-page--read-the-faq'],
    ['', 'grouped--sign-in-with-good-credentials'],
    ['', 'scripted-page--subscribe-to-the-newsletter'],
    ['failing', 'failing--sign-in-shows-the-wrong-user'],
  ].flatMap(([folder, name]) =>
    ['md', 'html'].map((ext) => ({
      rendered: reported(name, ext, folder),
      golden: `golden/${path.posix.join(folder, name)}.${ext}`,
      bundleDir: path.posix.join(REPORT, folder, name),
    })),
  ),
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
  { rendered: `${REPORT}/index.html`, golden: 'golden/index.html' },
  {
    rendered: `${REPORT}/failing/index.html`,
    golden: 'golden/failing/index.html',
  },
];

/** QA Report folders whose index links must all lead to files. */
export const REPORT_FOLDERS = [
  REPORT,
  `${REPORT}/failing`,
  `${REPORT}/result-override`,
];

const DATA_URI = /data:image\/png;base64,[A-Za-z0-9+/=]+/g;

/**
 * Rendered output as its golden stores it. Goldens name the fixture site on
 * its canonical port, whatever FIXTURE_PORT the run used. Screenshot bytes can
 * differ between machines, so HTML goldens keep a placeholder for each
 * embedded image; the images themselves are checked against the bundle's
 * assets instead.
 */
export function normalizeRendered(file, content) {
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
 * Hand-written expectations for each bundle's Step Screenshots: one per QA
 * Step, taken at the expected moment, with the Highlight marks it should
 * carry and pixel probes on known elements and on the Highlight itself.
 * Where a golden sets `resultsListed`, only the steps given a `result` have
 * a Result Screenshot, unhighlighted, with its own probes.
 */
export const SCREENSHOT_GOLDENS = [
  'golden/sign-in--sign-in-with-bad-credentials.screenshots.json',
  // resultScreenshots overrides: a middle step gets one too.
  'golden/sign-in--result-override.screenshots.json',
  'golden/scripted-page--subscribe-to-the-newsletter.screenshots.json',
  'golden/moving-ui--register-a-warranty-from-the-menu.screenshots.json',
  'golden/moving-ui--highlight-styles.screenshots.json',
  'golden/long-page--order-boots-from-the-bottom-of-the-page.screenshots.json',
];

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { RunLog, Rgb, type Bundle, type Point } from '@qa-instructions/e2e-kit';

import { derivedSteps, root } from '../scripts/spec-sync.ts';

/** What each sample run ended with (written by e2e/runs.setup.ts). */
export const runLog = new RunLog(path.join(root, 'e2e-results', 'runs'));

/**
 * The QA Report the main run wrote, with no render step: in Playwright's
 * default `outputDir`. The no-trace run's is in its own `outputDir`.
 */
export const report = path.join(root, 'test-results', 'qa-report');
export const noTraceReport = path.join(
  root,
  'test-results',
  'no-trace',
  'qa-report',
);

/** Each test's bundle and the derived-steps (Playwright 1.63) golden it must match. */
export const GOLDENS = [
  'sign-in--sign-in-with-bad-credentials',
  'grouped--sign-in-with-good-credentials',
  'scripted-page--read-the-faq',
  'scripted-page--open-collapsed-sections-on-a-page-without-any',
  'scripted-page--subscribe-to-the-newsletter',
  'login--sign-in-with-a-password',
  'moving-ui--register-a-warranty-from-the-menu',
  'cart--add-credits-to-the-cart',
  'long-page--order-boots-from-the-bottom-of-the-page',
  'long-page--order-gift-cards-on-a-smoothly-scrolling-page',
  'certificates--add-three-recs-to-the-cart',
  'keyboard--move-from-username-to-password-with-tab',
];

/** The 1.63 golden of a test's Jira text. */
export function goldenText(name: string): Promise<string> {
  return readFile(path.join(derivedSteps, 'golden', `${name}.txt`), 'utf8');
}

/** One test's directory in a QA Report. */
export class SavedTest {
  readonly dir: string;

  constructor(name: string, folder = report) {
    this.dir = path.join(folder, name);
  }

  async bundle(): Promise<Bundle> {
    return JSON.parse(
      await readFile(path.join(this.dir, 'bundle.json'), 'utf8'),
    );
  }

  async text(): Promise<string> {
    return readFile(path.join(this.dir, 'qa-steps.txt'), 'utf8');
  }

  async page(): Promise<string> {
    return readFile(path.join(this.dir, 'qa-steps.html'), 'utf8');
  }

  async asset(bundle: Bundle, assetId: string): Promise<Buffer> {
    return readFile(
      path.join(this.dir, 'assets', bundle.assets[assetId].filename),
    );
  }

  async assetNames(): Promise<string[]> {
    return readdir(path.join(this.dir, 'assets'));
  }
}

/**
 * A screenshot's color at a CSS pixel of the viewport (the recording's frame
 * may be scaled).
 */
export async function colorAt(
  image: Buffer,
  point: Point,
  viewport: { width: number; height: number },
) {
  const decoded = await Rgb.decode(image);
  return decoded.colorAt({
    x: Math.floor((point.x * decoded.width) / viewport.width),
    y: Math.floor((point.y * decoded.height) / viewport.height),
  });
}

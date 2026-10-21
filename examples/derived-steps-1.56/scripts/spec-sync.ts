import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/** This example's directory. */
export const root = path.join(import.meta.dirname, '..');

/** The derived-steps example this one reruns on Playwright 1.56. */
export const derivedSteps = path.join(root, '..', 'derived-steps');

/** The derived-steps tests rerun here, unchanged. */
export const SPECS = [
  'sign-in.spec.ts',
  'grouped.spec.ts',
  'scripted-page.spec.ts',
  'login.spec.ts',
  'moving-ui.spec.ts',
  'cart.spec.ts',
  'long-page.spec.ts',
  'certificates.spec.ts',
  'keyboard.spec.ts',
  'profile.spec.ts',
];

/**
 * Copies the derived-steps tests into ./tests. They must live in this
 * package so they load its Playwright (1.56), not derived-steps' (1.63).
 */
export class SpecSync {
  async run(): Promise<void> {
    const tests = path.join(root, 'tests');
    await mkdir(tests, { recursive: true });
    for (const spec of SPECS) {
      await copyFile(
        path.join(derivedSteps, 'tests', spec),
        path.join(tests, spec),
      );
    }
  }
}

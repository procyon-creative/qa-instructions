import path from 'node:path';

import type { QaReportOpenConventions } from '../core/index.js';
import { RunEnvironment } from './run-environment.js';

/** When to open the QA Report after a run: Playwright's HTML reporter's `open` values. */
export const QA_REPORT_OPEN_MODES = ['always', 'never', 'on-failure'] as const;

export type QaReportOpen = (typeof QA_REPORT_OPEN_MODES)[number];

export function isQaReportOpen(value: unknown): value is QaReportOpen {
  return (QA_REPORT_OPEN_MODES as readonly unknown[]).includes(value);
}

/**
 * The lines printed at the end of a run telling where the QA Report is and
 * how to open it, like Playwright's "To open last HTML report run" hint.
 */
export class QaReportHint {
  static readonly COMMAND = 'qa-instructions show-report';

  constructor(private readonly environment: RunEnvironment) {}

  text(folder: string): string {
    const relative = path.relative(this.environment.cwd, folder) || '.';
    const shown = /\s/.test(relative) ? JSON.stringify(relative) : relative;
    return `\nTo open last QA Report run:\n\n  ${this.environment.execCommand} ${QaReportHint.COMMAND} ${shown}\n`;
  }
}

/**
 * Decides whether a run opens its QA Report in a browser, as Playwright's
 * HTML reporter decides for its own: `always`, `never`, or `on-failure`
 * (the default, when any test failed or was flaky), and never on CI or with
 * no one at the terminal, whatever the mode. Its hint is Playwright's.
 */
export class QaReportOpenRule implements QaReportOpenConventions {
  static readonly DEFAULT: QaReportOpen = 'on-failure';

  constructor(
    readonly open: QaReportOpen = QaReportOpenRule.DEFAULT,
    private readonly environment = RunEnvironment.fromProcess(),
  ) {}

  /** `passed` is false when any test failed or was flaky. */
  shouldOpen(passed: boolean): boolean {
    if (this.environment.ci || !this.environment.interactive) return false;
    return this.open === 'always' || (this.open === 'on-failure' && !passed);
  }

  hint(folder: string): string {
    return new QaReportHint(this.environment).text(folder);
  }
}

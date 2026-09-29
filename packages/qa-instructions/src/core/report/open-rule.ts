import type { RunEnvironment } from './environment.js';

/** When to open the QA Report after a run: Playwright's HTML reporter's `open` values. */
export const QA_REPORT_OPEN_MODES = ['always', 'never', 'on-failure'] as const;

export type QaReportOpen = (typeof QA_REPORT_OPEN_MODES)[number];

export function isQaReportOpen(value: unknown): value is QaReportOpen {
  return (QA_REPORT_OPEN_MODES as readonly unknown[]).includes(value);
}

/**
 * Decides whether a run opens its QA Report in a browser, as Playwright's
 * HTML reporter decides for its own: `always`, `never`, or `on-failure`
 * (the default, when any test failed or was flaky), and never on CI or with
 * no one at the terminal, whatever the mode.
 */
export class QaReportOpenRule {
  static readonly DEFAULT: QaReportOpen = 'on-failure';

  constructor(readonly open: QaReportOpen = QaReportOpenRule.DEFAULT) {}

  /** `ok` is false when any test failed or was flaky. */
  shouldOpen(ok: boolean, environment: RunEnvironment): boolean {
    if (environment.ci || !environment.interactive) return false;
    return this.open === 'always' || (this.open === 'on-failure' && !ok);
  }
}

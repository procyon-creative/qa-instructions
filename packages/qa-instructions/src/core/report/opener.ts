import type { QaReportViewer } from './viewer.js';

/**
 * How the host runner's own report behaves once a run ends (ADR 0003),
 * supplied by that runner's adapter: whether this run opens the QA Report,
 * and the lines printed telling how to open it again.
 */
export interface QaReportOpenConventions {
  /** `passed` is false when the run had a test that did not pass, as the runner counts it. */
  shouldOpen(passed: boolean): boolean;
  hint(folder: string): string;
}

/**
 * What happens once a run has written its QA Report: the runner's hint is
 * printed, and the report opens in a browser when the runner's conventions
 * say so.
 */
export class QaReportOpener {
  constructor(
    private readonly conventions: QaReportOpenConventions,
    private readonly viewer: QaReportViewer,
    private readonly print: (text: string) => void = (text) =>
      console.log(text),
  ) {}

  /** `passed` is false when the run had a test that did not pass. */
  async afterRun(folder: string, passed: boolean): Promise<void> {
    this.print(this.conventions.hint(folder));
    if (this.conventions.shouldOpen(passed)) await this.viewer.show(folder);
  }
}

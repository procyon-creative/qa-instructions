import path from 'node:path';

import type { RunEnvironment } from './environment.js';
import type { QaReportOpenRule } from './open-rule.js';
import type { QaReportViewer } from './viewer.js';

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
 * What happens once a run has written its QA Report: the hint is printed,
 * and the report opens in a browser when the open rule says so.
 */
export class QaReportOpener {
  private readonly hint: QaReportHint;

  constructor(
    private readonly rule: QaReportOpenRule,
    private readonly environment: RunEnvironment,
    private readonly viewer: QaReportViewer,
    private readonly print: (text: string) => void = (text) =>
      console.log(text),
  ) {
    this.hint = new QaReportHint(environment);
  }

  /** `ok` is false when any test failed or was flaky. */
  async afterRun(folder: string, ok: boolean): Promise<void> {
    this.print(this.hint.text(folder));
    if (this.rule.shouldOpen(ok, this.environment)) {
      await this.viewer.show(folder);
    }
  }
}

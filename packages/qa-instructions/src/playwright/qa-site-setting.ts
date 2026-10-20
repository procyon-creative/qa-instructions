import { QaSite } from '../core/index.js';
import type { ReporterLog } from './reporter-log.js';

/**
 * Which QA Site a run uses: the `QA_SITE` environment variable, which
 * overrides the reporter's `qaSite` option for one run. A value that is
 * not an absolute http(s) address is ignored with one warning, in favor of
 * the next source, so a setup mistake never stops the run.
 */
export class QaSiteSetting {
  static readonly ENV = 'QA_SITE';

  constructor(
    private readonly log: ReporterLog,
    private readonly env: Record<string, string | undefined> = process.env,
  ) {}

  resolve(option: string | undefined): QaSite | undefined {
    return (
      this.parse(QaSiteSetting.ENV, this.env[QaSiteSetting.ENV]) ??
      this.parse('qaSite', option)
    );
  }

  private parse(name: string, value: unknown): QaSite | undefined {
    if (value === undefined || value === '') return undefined;
    try {
      if (typeof value !== 'string') throw new Error(`"${String(value)}"`);
      return QaSite.parse(value);
    } catch (error) {
      this.log.once(
        name,
        `ignoring the "${name}" setting (${String(error instanceof Error ? error.message : error)}); no QA Site is used from it.`,
      );
      return undefined;
    }
  }
}

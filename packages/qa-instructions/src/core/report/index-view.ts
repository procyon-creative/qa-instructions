import { InBundleLayout } from '../bundle/renderer.js';
import type { QaRunBundle } from '../model.js';
import { QaWording } from '../render/view.js';

type Status = QaRunBundle['meta']['status'];

/** One test in the QA Report as its index shows it. */
export type QaReportEntry = {
  title: string;
  status: Status;
  statusLabel: string;
  /** The test's page, relative to the index. */
  page: string;
  /** The test's Jira-ready text, relative to the index. */
  text: string;
};

/** A test's directory in the QA Report folder and the saved data in it. */
export type QaReportTest = { name: string; bundle: QaRunBundle };

/**
 * The QA Report's index as any format shows it: every test in the order
 * given, with its status and links to its page and Jira-ready text, which
 * the reporter writes into the test's directory (`InBundleLayout`).
 */
export class QaReportIndexView {
  static readonly TITLE = 'QA Report';

  private constructor(
    readonly tests: readonly QaReportEntry[],
    readonly summary: string,
  ) {}

  static from(tests: readonly QaReportTest[]): QaReportIndexView {
    const entries = tests.map(({ name, bundle }) =>
      QaReportIndexView.entry(name, bundle),
    );
    return new QaReportIndexView(entries, QaReportIndexView.summarize(entries));
  }

  private static entry(name: string, bundle: QaRunBundle): QaReportEntry {
    const status = bundle.meta.status;
    const link = (extension: string) =>
      `${encodeURIComponent(name)}/${InBundleLayout.BASENAME}${extension}`;
    return {
      title: bundle.meta.title,
      status,
      statusLabel: QaWording[status],
      page: link('.html'),
      text: link('.txt'),
    };
  }

  private static summarize(entries: readonly QaReportEntry[]): string {
    const count = (status: Status) =>
      entries.filter((entry) => entry.status === status).length;
    const tests = entries.length === 1 ? 'test' : 'tests';
    return `${entries.length} ${tests}: ${count('complete')} complete, ${count('incomplete')} incomplete`;
  }
}

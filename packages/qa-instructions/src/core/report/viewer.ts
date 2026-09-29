import { stat } from 'node:fs/promises';
import path from 'node:path';

import open from 'open';

import { QaReport } from './qa-report.js';

/** Opens a file in the default browser. */
export type BrowserOpener = (file: string) => Promise<unknown>;

/**
 * Opens a QA Report's index in the browser. The report is static and renders
 * offline, so its file is opened directly rather than served over HTTP as
 * Playwright's report is. The browser is opened with `open`, the library
 * Playwright uses.
 */
export class QaReportViewer {
  constructor(private readonly openInBrowser: BrowserOpener = open) {}

  /** Opens `folder`'s index and returns its path; throws if there is none. */
  async show(folder: string): Promise<string> {
    const index = path.join(folder, QaReport.INDEX);
    const found = await stat(index).then(
      (file) => file.isFile(),
      () => false,
    );
    if (!found) throw new Error(`No QA Report found at "${folder}"`);
    await this.openInBrowser(index);
    return index;
  }
}

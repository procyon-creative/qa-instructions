import { QaReportViewer } from '../core/index.js';
import { openInBrowser } from '../playwright/browser.js';
import { PlaywrightOutputFolder } from '../playwright/output-folder.js';

/**
 * `qa-instructions show-report [folder]`, like `playwright show-report`:
 * opens the last QA Report, or the one in `folder`. With no `folder` it looks
 * in Playwright's default `outputDir` (`test-results/qa-report/` beside the
 * package.json nearest the working directory); it never loads Playwright to
 * read a configured one.
 */
export class ShowReportCommand {
  constructor(
    private readonly viewer = new QaReportViewer(openInBrowser),
    private readonly cwd = process.cwd(),
    private readonly print: (text: string) => void = (text) =>
      console.log(text),
  ) {}

  async run(folder?: string): Promise<void> {
    const index = await this.viewer.show(
      new PlaywrightOutputFolder(this.cwd).forShowReport(folder),
    );
    this.print(`Opened the QA Report at ${index}`);
  }
}

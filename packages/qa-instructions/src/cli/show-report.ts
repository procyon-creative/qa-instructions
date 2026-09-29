import { QaReportViewer } from '../core/index.js';
import { openInBrowser } from '../playwright/browser.js';
import { PlaywrightOutputFolder } from '../playwright/output-folder.js';

/**
 * `qa-instructions show-report [folder]`, like `playwright show-report`:
 * opens the last QA Report, or the one in `folder`, found from the working
 * directory the way the reporter places it.
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
      new PlaywrightOutputFolder(folder).resolveFrom(this.cwd),
    );
    this.print(`Opened the QA Report at ${index}`);
  }
}

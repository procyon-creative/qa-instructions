import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readBundle } from '../bundle/io.js';
import { BundleOutputDir, type BundleOwner } from '../bundle/output-dir.js';
import { BundleRenderer, InBundleLayout } from '../bundle/renderer.js';
import { StaleBundlePolicy, type RunCoverage } from '../bundle/stale-policy.js';
import type { QaAssetInput, QaRunBundle } from '../model.js';
import type { RenderFormat } from '../render/index.js';
import { QaReportIndexHtml } from './index-html.js';
import { QaReportIndexView, type QaReportTest } from './index-view.js';

export type QaReportOptions = {
  /** Formats written for every test besides its page and Jira-ready text. */
  formats?: readonly RenderFormat[];
  /** Which tests' directories from earlier runs to remove. */
  stalePolicy?: StaleBundlePolicy;
};

/**
 * The QA Report a test run leaves in one folder: `index.html` listing every
 * test, and a directory per test holding its saved data (`bundle.json`,
 * `assets/`), its page (`qa-steps.html`, screenshots embedded), its
 * Jira-ready text (`qa-steps.txt`), and any other formats asked for.
 */
export class QaReport {
  /** What every test gets, whatever else is asked for. */
  static readonly FORMATS: readonly RenderFormat[] = ['qa-steps', 'html'];
  static readonly INDEX = 'index.html';

  private readonly output: BundleOutputDir;
  private readonly renderers: BundleRenderer[];
  private readonly stalePolicy: StaleBundlePolicy;

  constructor(
    readonly folder: string,
    options: QaReportOptions = {},
    private readonly index = new QaReportIndexHtml(),
  ) {
    this.output = new BundleOutputDir(folder);
    this.stalePolicy = options.stalePolicy ?? new StaleBundlePolicy();
    const layout = new InBundleLayout();
    const formats = new Set([...QaReport.FORMATS, ...(options.formats ?? [])]);
    this.renderers = [...formats].map(
      (format) => new BundleRenderer(format, layout),
    );
  }

  /** Writes one test's saved data, then renders each of its formats from it. */
  async writeTest(
    name: string,
    bundle: QaRunBundle,
    assets: QaAssetInput[],
    owner: BundleOwner,
  ): Promise<void> {
    const dir = await this.output.write(name, bundle, assets, owner);
    for (const renderer of this.renderers) await renderer.render(dir);
  }

  /**
   * Removes the directories of tests from earlier runs that are stale (see
   * `StaleBundlePolicy`). `written` names every test this run has a result
   * for, even one that failed to write, so a write error never costs an
   * earlier result.
   */
  async removeStale(
    written: ReadonlySet<string>,
    coverage: RunCoverage,
  ): Promise<void> {
    const stale = this.stalePolicy.staleDirs(
      await this.output.owned(),
      written,
      coverage,
    );
    await this.output.remove(stale);
  }

  /**
   * Writes `index.html` listing every test in the folder, in directory
   * order, and returns its path. A directory whose saved data cannot be read
   * is left out.
   */
  async writeIndex(): Promise<string> {
    const tests: QaReportTest[] = [];
    for (const { name } of await this.output.owned()) {
      try {
        tests.push({
          name,
          bundle: await readBundle(path.join(this.folder, name)),
        });
      } catch {
        // A test whose write failed part-way has no page to link to.
      }
    }
    const file = path.join(this.folder, QaReport.INDEX);
    await mkdir(this.folder, { recursive: true });
    await writeFile(
      file,
      this.index.render(QaReportIndexView.from(tests)),
      'utf8',
    );
    return file;
  }
}

import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  HighlightPlanner,
  isRenderFormat,
  QaInstructionsRecorder,
  QaInstructionsRun,
  QaReport,
  SecretMasker,
  StaleBundlePolicy,
  StepScreenshotHighlighter,
  TestSelection,
  type HighlightStyle,
  type MaskPattern,
  type RenderFormat,
  type TestSelectionOptions,
  type QaInstructionsResult,
  type SectionPresentation,
} from '../core/index.js';

import { AttemptTraces } from './attempt-traces.js';
import { PlaywrightOutputFolder } from './output-folder.js';
import { ReporterLog } from './reporter-log.js';
import { PlaywrightRunCoverage } from './run-coverage.js';
import { SharpScreenshotAnnotator } from './sharp-screenshot-annotator.js';
import { PlaywrightStepTranslator } from './step-translator.js';
import { TraceAdvice } from './trace-advice.js';

export type QaInstructionsReporterOptions = {
  /**
   * The folder the QA Report is written to, named and resolved like
   * Playwright's HTML reporter option: relative to the config file.
   * Default `qa-report`, beside the project's package.json.
   */
  outputFolder?: string;
  /**
   * Limit which tests produce QA Instructions, by tag and by test file glob.
   * Default: every test. Unselected tests still run and produce nothing.
   */
  select?: TestSelectionOptions;
  /**
   * How the test's own `test.step` groups appear: as Section headings
   * (`sections`, default), each collapsed into one QA Step (`collapse`), or
   * not at all (`ignore`).
   */
  testSteps?: SectionPresentation;
  /**
   * More secrets to mask wherever they would appear (API keys, emails): exact
   * strings, or regular expressions. Values typed into password fields are
   * always masked when the trace records DOM snapshots.
   */
  mask?: MaskPattern[];
  /**
   * How each Step Screenshot marks the element acted on: `outline`,
   * `clickDot`, `badge` (the step number), `spotlight`, a list of these, or
   * `none`. Default `['outline', 'clickDot']`.
   */
  highlight?: HighlightStyle;
  /**
   * More formats written into each test's directory of the QA Report, which
   * always holds its page (`qa-steps.html`) and Jira-ready text
   * (`qa-steps.txt`): `markdown` (`qa-steps.md`, linking the test's
   * screenshots), `json` (`qa-steps.json`). Default none.
   */
  formats?: RenderFormat[];
};

/**
 * Playwright reporter that derives QA Instructions from what each test
 * already does and writes them as a QA Report. Add it to `reporter` in
 * playwright.config; tests are not changed. Imports Playwright for types
 * only; the QA Report itself is the core's `QaReport`.
 *
 * Nothing it does can fail the test run: every hook catches its own errors
 * and reports them once on stderr, along with any setup advice (such as the
 * trace setting Step Screenshots need).
 */
export default class QaInstructionsReporter implements Reporter {
  private readonly folder: PlaywrightOutputFolder;
  private readonly selection: TestSelection;
  private readonly formats: RenderFormat[];
  private advice = new TraceAdvice();
  private config?: FullConfig;

  constructor(
    options: QaInstructionsReporterOptions = {},
    private readonly translator = new PlaywrightStepTranslator(),
    masker = new SecretMasker(options.mask),
    private readonly run = new QaInstructionsRun(
      () => new QaInstructionsRecorder({ sections: options.testSteps, masker }),
      undefined,
      masker,
    ),
    private readonly traces = new AttemptTraces(),
    private readonly highlighter = new StepScreenshotHighlighter(
      new SharpScreenshotAnnotator(),
      new HighlightPlanner(options.highlight),
      (step, error) => this.warnHighlight(step.action, error),
    ),
    private readonly log = new ReporterLog(),
    private readonly coverage = new PlaywrightRunCoverage(),
  ) {
    this.folder = new PlaywrightOutputFolder(options.outputFolder);
    this.selection = this.selectionOf(options.select);
    this.formats = this.formatsOf(options.formats);
  }

  printsToStdio(): boolean {
    return false;
  }

  /**
   * Learns the project's Playwright version, for version-specific advice, and
   * the run's configuration, to tell whether it covers the whole suite.
   */
  onBegin(config: FullConfig): void {
    try {
      this.config = config;
      this.advice = new TraceAdvice(config?.version);
    } catch (error) {
      this.log.error('this run', error);
    }
  }

  /** Called once per attempt; the run keeps each test's last attempt. */
  onTestEnd(test: TestCase, result: TestResult): void {
    try {
      if (!this.selection.includes(this.translator.testStart(test))) return;

      for (const event of this.translator.translate(test, result)) {
        this.run.handle(event);
      }
      this.traces.add(test.id, result.retry + 1, result.attachments);
    } catch (error) {
      this.log.error(test?.title, error);
    }
  }

  /**
   * Writes the QA Report once every attempt has been seen: each test's
   * QA Instructions, with Step Screenshots from the trace of the attempt
   * they came from, highlighted; then removes stale tests from earlier runs
   * and writes the index.
   */
  async onEnd(result?: FullResult): Promise<void> {
    let results: QaInstructionsResult[] = [];
    let report: QaReport;
    try {
      results = this.run.results();
      report = new QaReport(this.folder.resolve(this.config?.configFile), {
        formats: this.formats,
        stalePolicy: new StaleBundlePolicy(this.selection),
      });
    } catch (error) {
      this.log.error('this run', error);
      return;
    }
    for (const testResult of results) {
      try {
        await this.write(report, testResult);
      } catch (error) {
        this.log.error(testResult.bundle.meta.title, error);
      }
    }
    try {
      await report.removeStale(
        new Set(results.map(({ dirName }) => dirName)),
        this.coverage.of(this.config, result),
      );
    } catch (error) {
      this.log.error('stale QA Instructions', error);
    }
    try {
      await report.writeIndex();
    } catch (error) {
      this.log.error('the QA Report index', error);
    }
  }

  private async write(
    report: QaReport,
    result: QaInstructionsResult,
  ): Promise<void> {
    const { source, problem } = await this.traces.screenshots(
      result.start.id,
      result.start.attempt,
    );
    if (problem) {
      this.log.once(this.advice.key(problem), this.advice.message(problem));
    }
    const { bundle, assets } = await this.highlighter.highlight(
      result.record(source),
    );
    await report.writeTest(result.dirName, bundle, assets, {
      file: result.start.file,
      tags: result.start.tags,
    });
  }

  private warnHighlight(step: string, error: unknown): void {
    console.warn(
      `qa-instructions: could not highlight the screenshot for "${step}"; kept it unmarked: ${String(error)}`,
    );
  }

  /** An unusable `select` option is ignored, with a warning, rather than stopping the run. */
  private selectionOf(select: TestSelectionOptions | undefined): TestSelection {
    try {
      return new TestSelection(select);
    } catch (error) {
      this.log.once(
        'select',
        `ignoring the "select" option (${String(error)}); every test produces QA Instructions.`,
      );
      return new TestSelection();
    }
  }

  /** Unknown formats are dropped, with one warning, rather than stopping the run. Duplicates of the always-written formats are harmless. */
  private formatsOf(formats: readonly string[] | undefined): RenderFormat[] {
    if (formats === undefined) return [];
    const list = Array.isArray(formats) ? formats : [];
    const known = list.filter(isRenderFormat);
    if (!Array.isArray(formats) || known.length < list.length) {
      this.log.once(
        'formats',
        `ignoring unknown "formats" (${String(formats)}); the QA Report adds ${known.join(', ') || 'no other formats'}.`,
      );
    }
    return [...new Set(known)];
  }
}

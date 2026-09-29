import { existsSync } from 'node:fs';
import path from 'node:path';

import type { FullConfig, Suite } from '@playwright/test/reporter';

/**
 * Where the QA Report goes: `qa-report/` inside Playwright's own tests output
 * folder, `outputDir` (default `test-results/` beside the nearest
 * package.json). Playwright clears that folder when a run starts, before the
 * QA Report is written, and no reporter deletes it afterward (the HTML
 * reporter deletes `playwright-report/` whenever it writes).
 *
 * Playwright resolves `outputDir` per project, and reporters see no run-wide
 * one. Projects inherit the config's `outputDir`, so they normally share it;
 * when they differ, the first project in the run (in config order) decides, since its folder
 * is one Playwright cleared for this run.
 */
export class PlaywrightOutputFolder {
  static readonly NAME = 'qa-report';
  /** Playwright's default `outputDir`. */
  static readonly DEFAULT_OUTPUT_DIR = 'test-results';

  /** `cwd` stands in for the config file's directory when there is none. */
  constructor(private readonly cwd = process.cwd()) {}

  /** The run's QA Report folder, from what `onBegin` received. */
  forRun(config: FullConfig | undefined, suite?: Suite): string {
    const outputDir =
      this.firstProjectOutputDir(config, suite) ??
      this.defaultOutputDir(
        config?.configFile ? path.dirname(config.configFile) : this.cwd,
      );
    return path.join(outputDir, PlaywrightOutputFolder.NAME);
  }

  /**
   * The folder `show-report` opens: `folder` relative to the working
   * directory, else the QA Report in Playwright's default `outputDir`.
   */
  forShowReport(folder?: string): string {
    if (folder) return path.resolve(this.cwd, folder);
    return path.join(
      this.defaultOutputDir(this.cwd),
      PlaywrightOutputFolder.NAME,
    );
  }

  /**
   * The `outputDir` of the first project in the run (the root suite holds
   * one suite per project the run includes, in config order), else of the
   * first configured one.
   */
  private firstProjectOutputDir(
    config: FullConfig | undefined,
    suite: Suite | undefined,
  ): string | undefined {
    const ran = suite?.suites?.[0]?.project();
    return (ran ?? config?.projects?.[0])?.outputDir;
  }

  /** Playwright's default `outputDir`: beside the package.json nearest `from`, else in the working directory. */
  private defaultOutputDir(from: string): string {
    return path.join(
      this.packageDir(from) ?? this.cwd,
      PlaywrightOutputFolder.DEFAULT_OUTPUT_DIR,
    );
  }

  private packageDir(from: string): string | undefined {
    for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
      if (existsSync(path.join(dir, 'package.json'))) return dir;
      if (path.dirname(dir) === dir) return undefined;
    }
  }
}

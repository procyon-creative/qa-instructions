import path from 'node:path';

import {
  isRenderFormat,
  QaReport,
  RENDER_FORMATS,
  type RenderFormat,
} from '../core/index.js';

/**
 * `qa-instructions render <folder> [--format <format>]...`: regenerates the
 * QA Report in `folder` from the saved data a run left there, without
 * rerunning the tests. Every test gets its page and Jira-ready text again,
 * plus each `--format` asked for (as the reporter's `formats` option), and
 * the index is rewritten.
 */
export class RenderCommand {
  static readonly USAGE = `qa-instructions render <folder> [--format ${RENDER_FORMATS.join('|')}]...`;

  constructor(
    private readonly cwd = process.cwd(),
    private readonly print: (text: string) => void = (text) =>
      console.log(text),
  ) {}

  async run(args: readonly string[]): Promise<void> {
    const { folder, formats } = this.parse(args);
    const report = new QaReport(path.resolve(this.cwd, folder), { formats });

    const rendered = await report.render();
    if (rendered.length === 0) {
      throw new Error(`No QA Report data found in ${report.folder}`);
    }
    for (const dir of rendered) this.print(`rendered ${dir}`);
    this.print(`Wrote the QA Report at ${await report.writeIndex()}`);
  }

  private parse(args: readonly string[]): {
    folder: string;
    formats: RenderFormat[];
  } {
    const [folder, ...rest] = args;
    if (!folder || folder.startsWith('--')) {
      throw new Error(`Usage: ${RenderCommand.USAGE}`);
    }
    const formats: RenderFormat[] = [];
    for (let i = 0; i < rest.length; i += 2) {
      const [option, value] = [rest[i], rest[i + 1]];
      if (option !== '--format') {
        throw new Error(
          `Unknown option "${option}".\nUsage: ${RenderCommand.USAGE}`,
        );
      }
      if (!value || !isRenderFormat(value)) {
        throw new Error(
          `Unknown format "${value ?? ''}".\nUsage: ${RenderCommand.USAGE}`,
        );
      }
      formats.push(value);
    }
    return { folder, formats };
  }
}

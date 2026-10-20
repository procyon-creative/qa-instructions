import path from 'node:path';

import {
  isRenderFormat,
  QaReport,
  QaSite,
  RENDER_FORMATS,
  type RenderFormat,
} from '../core/index.js';

/**
 * `qa-instructions render <folder> [--format <format>]... [--qa-site <url>]`:
 * regenerates the QA Report in `folder` from the saved data a run left
 * there, without rerunning the tests. Every test gets its page and
 * Jira-ready text again, plus each `--format` asked for (as the reporter's
 * `formats` option), and the index is rewritten. `--qa-site` points Test
 * Site addresses at the QA Site the tester uses (as the reporter's `qaSite`
 * option); the saved data keeps the original addresses.
 */
export class RenderCommand {
  static readonly USAGE = `qa-instructions render <folder> [--format ${RENDER_FORMATS.join('|')}]... [--qa-site <url>]`;

  constructor(
    private readonly cwd = process.cwd(),
    private readonly print: (text: string) => void = (text) =>
      console.log(text),
  ) {}

  async run(args: readonly string[]): Promise<void> {
    const { folder, formats, qaSite } = this.parse(args);
    const report = new QaReport(path.resolve(this.cwd, folder), {
      formats,
      qaSite,
    });

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
    qaSite?: QaSite;
  } {
    const [folder, ...rest] = args;
    if (!folder || folder.startsWith('--')) {
      throw new Error(`Usage: ${RenderCommand.USAGE}`);
    }
    const formats: RenderFormat[] = [];
    let qaSite: QaSite | undefined;
    for (let i = 0; i < rest.length; i += 2) {
      const [option, value] = [rest[i], rest[i + 1]];
      if (option === '--qa-site') {
        if (!value) {
          throw new Error(`Missing address.\nUsage: ${RenderCommand.USAGE}`);
        }
        qaSite = QaSite.parse(value);
        continue;
      }
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
    return { folder, formats, qaSite };
  }
}

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

/** A test row of a QA Report's index: its title, status, and links. */
export interface IndexRow {
  title: string;
  status: string;
  /** The test's page, relative to the report folder. */
  page: string;
  /** The test's Jira text, relative to the report folder. */
  text: string;
}

/** Reads a QA Report's `index.html`. */
export class ReportIndex {
  private static readonly ROW =
    /<tr>\n<td><a href="([^"]+)">([^<]*)<\/a><\/td>\n<td class="status (\w+)">[^<]*<\/td>\n<td><a href="([^"]+)">/g;

  private readonly folder: string;

  constructor(folder: string) {
    this.folder = folder;
  }

  async rows(): Promise<IndexRow[]> {
    const html = await readFile(path.join(this.folder, 'index.html'), 'utf8');
    return [...html.matchAll(ReportIndex.ROW)].map(
      ([, page, title, status, text]) => ({
        title,
        status,
        page: decodeURIComponent(page),
        text: decodeURIComponent(text),
      }),
    );
  }

  /** The index's links, relative to the folder, that lead to no file. */
  async brokenLinks(): Promise<string[]> {
    const broken: string[] = [];
    for (const { page, text } of await this.rows()) {
      for (const link of [page, text]) {
        try {
          await access(path.join(this.folder, link));
        } catch {
          broken.push(link);
        }
      }
    }
    return broken;
  }
}

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

// Reads a QA Report's index.html. Dependency-free, so the 1.56 example can
// import it too.

/** Each test row of the index: its title, status, and links. */
export async function readReportIndex(folder) {
  const html = await readFile(path.join(folder, 'index.html'), 'utf8');
  const rows = html.matchAll(
    /<tr>\n<td><a href="([^"]+)">([^<]*)<\/a><\/td>\n<td class="status (\w+)">[^<]*<\/td>\n<td><a href="([^"]+)">/g,
  );
  return [...rows].map(([, page, title, status, text]) => ({
    title,
    status,
    page: decodeURIComponent(page),
    text: decodeURIComponent(text),
  }));
}

/** The index's links, relative to the folder, that lead to no file. */
export async function brokenIndexLinks(folder) {
  const broken = [];
  for (const { page, text } of await readReportIndex(folder)) {
    for (const link of [page, text]) {
      try {
        await access(path.join(folder, link));
      } catch {
        broken.push(link);
      }
    }
  }
  return broken;
}

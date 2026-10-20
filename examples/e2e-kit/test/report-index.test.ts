import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { ReportIndex } from '../src/report-index.ts';

const row = (dir: string, title: string, status: string) =>
  `<tr>\n<td><a href="${dir}/qa-steps.html">${title}</a></td>\n<td class="status ${status}">${status}</td>\n<td><a href="${dir}/qa-steps.txt">text</a></td>\n</tr>\n`;

async function report(rows: string, files: string[]): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'report-index-'));
  await writeFile(path.join(folder, 'index.html'), `<table>\n${rows}</table>`);
  for (const file of files) {
    await mkdir(path.dirname(path.join(folder, file)), { recursive: true });
    await writeFile(path.join(folder, file), '');
  }
  return folder;
}

test('lists each test row with its title, status, and links', async () => {
  const folder = await report(row('a%20b', 'Test A', 'complete'), []);
  try {
    assert.deepEqual(await new ReportIndex(folder).rows(), [
      {
        title: 'Test A',
        status: 'complete',
        page: 'a b/qa-steps.html',
        text: 'a b/qa-steps.txt',
      },
    ]);
  } finally {
    await rm(folder, { recursive: true });
  }
});

test('names the links that lead to no file', async () => {
  const folder = await report(row('a', 'A', 'complete'), ['a/qa-steps.html']);
  try {
    assert.deepEqual(await new ReportIndex(folder).brokenLinks(), [
      'a/qa-steps.txt',
    ]);
  } finally {
    await rm(folder, { recursive: true });
  }
});

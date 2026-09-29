import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { RenderCommand } from '../../src/cli/render.js';
import {
  DEFAULT_HIGHLIGHT,
  QaReport,
  RENDER_FORMATS,
  RESULT_SCREENSHOT_STEPS,
  ResultScreenshotRule,
  STEP_SCREENSHOTS,
} from '../../src/core/index.js';
import { PlaywrightOutputFolder } from '../../src/playwright/output-folder.js';
import {
  QA_REPORT_OPEN_MODES,
  QaReportHint,
  QaReportOpenRule,
} from '../../src/playwright/report-opening.js';

// Tests run from dist-test/test/package/, three levels below the package root.
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const repoRoot = path.resolve(packageRoot, '..', '..');

/** The README's `## <heading>` section, up to the next `## ` heading. */
async function readmeSection(heading: string): Promise<string> {
  const readme = await readFile(path.join(repoRoot, 'README.md'), 'utf8');
  const start = readme.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `README has no "## ${heading}" section`);
  const end = readme.indexOf('\n## ', start + 1);
  return readme.slice(start, end < 0 ? undefined : end);
}

/** The property names declared in `type <name> = { ... };` in a source file. */
async function typeKeys(file: string, name: string): Promise<string[]> {
  const source = await readFile(file, 'utf8');
  const match = new RegExp(`type ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(
    source,
  );
  assert.ok(match, `${name} not found in ${file}`);
  return [...match[1].matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
}

test('README documents every reporter option', async () => {
  const section = await readmeSection('Reporter options');
  const keys = await typeKeys(
    path.join(packageRoot, 'src', 'playwright', 'index.ts'),
    'QaInstructionsReporterOptions',
  );
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.ok(
      section.includes(`### \`${key}\``),
      `README "Reporter options" has no heading for \`${key}\``,
    );
  }
});

test('README documents every select key', async () => {
  const section = await readmeSection('Reporter options');
  const keys = await typeKeys(
    path.join(packageRoot, 'src', 'core', 'selection.ts'),
    'TestSelectionOptions',
  );
  for (const key of keys) {
    assert.ok(section.includes(`\`${key}\``), `README omits select.${key}`);
  }
});

test('README states the default highlight', async () => {
  const section = await readmeSection('Reporter options');
  const quoted = DEFAULT_HIGHLIGHT.map((mark) => `'${mark}'`).join(', ');
  assert.ok(section.includes(`[${quoted}]`));
});

test('README documents the render command with every format', async () => {
  const section = await readmeSection('Render');
  assert.ok(section.includes(`npx ${RenderCommand.USAGE}`));
  for (const format of RENDER_FORMATS) {
    assert.ok(section.includes(format), `README "Render" omits ${format}`);
  }
});

test('README lists every format the formats option takes, and what every test gets anyway', async () => {
  const section = await readmeSection('Reporter options');
  const formats = section.slice(section.indexOf('### `formats`'));
  for (const format of RENDER_FORMATS) {
    assert.ok(
      formats.includes(`| \`${format}\``),
      `README "formats" omits ${format}`,
    );
  }
  for (const format of QaReport.FORMATS) {
    assert.match(
      formats,
      new RegExp(`\\| \`${format}\` +\\|[^\\n]*\\| Always`),
      `README "formats" does not say ${format} is always written`,
    );
  }
});

test("README states the QA Report goes inside Playwright's outputDir, with no option of its own", async () => {
  const section = await readmeSection('Reporter options');
  const { NAME, DEFAULT_OUTPUT_DIR } = PlaywrightOutputFolder;
  assert.ok(section.includes(`\`<outputDir>/${NAME}/\``));
  assert.ok(section.includes(`\`${DEFAULT_OUTPUT_DIR}/${NAME}/\``));
  assert.doesNotMatch(section, /\| `outputFolder`|### `outputFolder`/);
});

test('README shows show-report opening the default QA Report', async () => {
  const section = await readmeSection('Show report');
  const { NAME, DEFAULT_OUTPUT_DIR } = PlaywrightOutputFolder;
  assert.ok(section.includes(`\`${DEFAULT_OUTPUT_DIR}/${NAME}/\``));
});

test('README states the open option values and default', async () => {
  const section = await readmeSection('Reporter options');
  const values = QA_REPORT_OPEN_MODES.map((mode) => `'${mode}'`).join(
    ' \\\\\\| ',
  );
  assert.match(
    section,
    new RegExp(
      `\\| \`open\` +\\| \`${values}\` +\\| \`'${QaReportOpenRule.DEFAULT}'\``,
    ),
  );
});

test('README states the resultScreenshots values, default, and override choices', async () => {
  const section = await readmeSection('Reporter options');
  const values = RESULT_SCREENSHOT_STEPS.map((steps) => `'${steps}'`).join(
    ' \\\\\\| ',
  );
  assert.match(
    section,
    new RegExp(
      `\\| \`resultScreenshots\` +\\| \`${values}\` or \`\\{ steps, overrides \\}\` +\\| \`'${ResultScreenshotRule.DEFAULT}'\``,
    ),
  );
  const option = section.slice(section.indexOf('### `resultScreenshots`'));
  for (const choice of STEP_SCREENSHOTS) {
    assert.ok(
      option.includes(`| \`'${choice}'\``),
      `README "resultScreenshots" omits ${choice}`,
    );
  }
});

test('README documents the show-report command', async () => {
  const section = await readmeSection('Show report');
  assert.ok(section.includes(`npx ${QaReportHint.COMMAND} [folder]`));
});

test('README states the peer dependency Playwright range', async () => {
  const pkg = JSON.parse(
    await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
  ) as { peerDependencies: Record<string, string> };
  const range = /^>=(\d+)\.(\d+)\.0$/.exec(
    pkg.peerDependencies['@playwright/test'],
  );
  assert.ok(range, 'peer range is not ">=X.Y.0"');
  const section = await readmeSection('Playwright versions');
  assert.ok(
    section.includes(`\`@playwright/test\` ${range[1]}.${range[2]} or later`),
  );
});

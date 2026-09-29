import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  QA_REPORT_OPEN_MODES,
  QaReport,
  QaReportHint,
  QaReportOpener,
  QaReportOpenRule,
  QaReportViewer,
  RunEnvironment,
  isQaReportOpen,
  type QaReportOpen,
} from '../../src/core/index.js';

const LOCAL = new RunEnvironment({ ci: false, interactive: true });

test("the open modes and default are Playwright's HTML reporter's", () => {
  assert.deepEqual(QA_REPORT_OPEN_MODES, ['always', 'never', 'on-failure']);
  assert.equal(QaReportOpenRule.DEFAULT, 'on-failure');
  assert.equal(new QaReportOpenRule().open, 'on-failure');
  assert.ok(isQaReportOpen('never'));
  assert.ok(!isQaReportOpen('sometimes'));
  assert.ok(!isQaReportOpen(undefined));
});

test('opens by mode and outcome when run locally', () => {
  const cases: [QaReportOpen, boolean, boolean][] = [
    ['always', true, true],
    ['always', false, true],
    ['never', true, false],
    ['never', false, false],
    ['on-failure', true, false],
    ['on-failure', false, true],
  ];
  for (const [open, ok, expected] of cases) {
    assert.equal(
      new QaReportOpenRule(open).shouldOpen(ok, LOCAL),
      expected,
      `${open}, ok=${ok}`,
    );
  }
});

test('never opens in CI or without an interactive terminal, whatever the mode', () => {
  const ci = new RunEnvironment({ ci: true, interactive: true });
  const unattended = new RunEnvironment({ ci: false, interactive: false });
  for (const open of QA_REPORT_OPEN_MODES) {
    for (const ok of [true, false]) {
      assert.equal(new QaReportOpenRule(open).shouldOpen(ok, ci), false);
      assert.equal(
        new QaReportOpenRule(open).shouldOpen(ok, unattended),
        false,
      );
    }
  }
});

test('reads CI, the terminal, and the package manager like Playwright', () => {
  const tty = { isTTY: true };
  const local = RunEnvironment.fromProcess({}, tty);
  assert.equal(local.ci, false);
  assert.equal(local.interactive, true);
  assert.equal(local.execCommand, 'npx');

  assert.equal(RunEnvironment.fromProcess({ CI: 'true' }, tty).ci, true);
  assert.equal(RunEnvironment.fromProcess({ CI: '1' }, tty).ci, true);
  assert.equal(RunEnvironment.fromProcess({ CI: '' }, tty).ci, false);
  assert.equal(RunEnvironment.fromProcess({}, {}).interactive, false);
  assert.equal(
    RunEnvironment.fromProcess({ CLAUDECODE: '1' }, tty).interactive,
    false,
  );
  assert.equal(
    RunEnvironment.fromProcess({ COPILOT_CLI: '1' }, tty).interactive,
    false,
  );
  const agent = (ua: string) =>
    RunEnvironment.fromProcess({ npm_config_user_agent: ua }, tty).execCommand;
  assert.equal(agent('pnpm/10.0.0 npm/? node/v22'), 'pnpm exec');
  assert.equal(agent('yarn/4.0.0 npm/? node/v22'), 'yarn');
  assert.equal(agent('npm/10.0.0 node/v22'), 'npx');
});

test('the hint names the folder relative to the working directory and the show-report command', () => {
  const env = new RunEnvironment({
    ci: true,
    interactive: false,
    execCommand: 'pnpm exec',
    cwd: '/proj',
  });
  const hint = new QaReportHint(env);
  assert.equal(
    hint.text('/proj/qa-report'),
    '\nTo open last QA Report run:\n\n  pnpm exec qa-instructions show-report qa-report\n',
  );
  assert.match(hint.text('/proj'), /show-report \.\n/);
  assert.match(hint.text('/proj/my reports'), /show-report "my reports"\n/);
});

async function withReport(
  run: (folder: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-open-'));
  try {
    const folder = path.join(root, 'qa-report');
    await mkdir(folder);
    await writeFile(path.join(folder, QaReport.INDEX), '<html></html>');
    await run(folder);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("the viewer opens the report's index in the browser", async () => {
  await withReport(async (folder) => {
    const opened: string[] = [];
    const viewer = new QaReportViewer(async (target) => {
      opened.push(target);
    });
    assert.equal(await viewer.show(folder), path.join(folder, QaReport.INDEX));
    assert.deepEqual(opened, [path.join(folder, QaReport.INDEX)]);
  });
});

test('the viewer refuses a folder with no QA Report', async () => {
  const opened: string[] = [];
  const viewer = new QaReportViewer(async (target) => {
    opened.push(target);
  });
  await assert.rejects(
    viewer.show(path.join(tmpdir(), 'no-such-qa-report')),
    /No QA Report found at/,
  );
  assert.deepEqual(opened, []);
});

async function finish(
  folder: string,
  open: QaReportOpen,
  ok: boolean,
  env: RunEnvironment,
): Promise<{ opened: string[]; printed: string[] }> {
  const opened: string[] = [];
  const printed: string[] = [];
  const opener = new QaReportOpener(
    new QaReportOpenRule(open),
    env,
    new QaReportViewer(async (target) => {
      opened.push(target);
    }),
    (text) => printed.push(text),
  );
  await opener.afterRun(folder, ok);
  return { opened, printed };
}

test('after a run, prints the hint and opens the report when the rule says so', async () => {
  await withReport(async (folder) => {
    const env = new RunEnvironment({
      ci: false,
      interactive: true,
      cwd: path.dirname(folder),
    });
    const failed = await finish(folder, 'on-failure', false, env);
    assert.deepEqual(failed.opened, [path.join(folder, QaReport.INDEX)]);
    assert.deepEqual(failed.printed, [new QaReportHint(env).text(folder)]);

    const passed = await finish(folder, 'on-failure', true, env);
    assert.deepEqual(passed.opened, []);
    assert.equal(passed.printed.length, 1);
  });
});

test('after a CI run, opens nothing and still prints the hint', async () => {
  await withReport(async (folder) => {
    const env = new RunEnvironment({ ci: true, interactive: true });
    const { opened, printed } = await finish(folder, 'always', false, env);
    assert.deepEqual(opened, []);
    assert.match(printed.join(''), /qa-instructions show-report/);
  });
});

# The QA Report behaves like the host runner's own HTML report

A client adds the reporter line and runs their tests; nothing else. Every run produces a QA Report: a browsable HTML report (an index plus one page per test with its screenshots) and each test's QA Instructions as Jira-ready text, written automatically so it is ready to paste with no extra step. Rendering is part of the run, not a separate command.

How the report behaves copies the host runner instead of inventing our own: for Playwright, the option names and defaults of Playwright's HTML reporter (`open: 'always' | 'never' | 'on-failure'`) and a `show-report` command like `npx playwright show-report`. A future Jest adapter follows Jest's reporter conventions.

## Where the QA Report goes

Everything a run writes lives in one folder inside the runner's own output folder, with no folder option of ours. For Playwright that is the tests' output folder, `outputDir` (default `test-results/` beside the nearest `package.json`): the QA Report is `<outputDir>/qa-report/`, and users move it by setting Playwright's `outputDir` (or `--output`). The `outputFolder` option we had before is removed; setting it warns once and is ignored, like other unusable options.

- **Not `playwright-report/`**: Playwright's HTML reporter deletes its output folder whenever it writes (`removeFolders([this._outputFolder])`, playwright 1.63 `lib/runner/index.js`), so a QA Report there would vanish on any run that also uses the HTML reporter.
- **`test-results/` is safe to write to**: Playwright clears each project's `outputDir` at the start of a run (its "clear output" global setup task), before any reporter's `onEnd`, where the QA Report is written. A `playwright test` run's QA Report therefore holds exactly that run's tests, as Playwright's own output does.
- **Several projects**: Playwright resolves `outputDir` per project (`FullProject.outputDir`); `FullConfig` exposes no run-wide one (checked in the public types of 1.56 and 1.63). Projects inherit the config's `outputDir`, so they normally share one. When they differ, the first project in the run (in config order, not execution order) decides, falling back to the first configured project: its folder is one Playwright cleared for this run, and the rule is predictable from the config. This choice lives in the Playwright adapter (`PlaywrightOutputFolder`); the core's `QaReport` just takes a folder and stays runner-independent (ADR 0001).
- **`show-report`** never loads Playwright at runtime (ADR 0001, ADR 0002), so with no folder it opens the default location, `test-results/qa-report/` beside the `package.json` nearest the working directory. The hint printed at the end of a run names the folder the run really wrote.
- **Jest** has no default output folder; a future Jest adapter decides its own.

## Considered Options

- **Bundles plus a separate render command** (the previous design): rejected; clients had to run a second command to see anything.
- **A copy button for the Jira text**: rejected; the text must already exist after the run without anyone doing anything.
- **Our own option names and auto-open behavior**: rejected; users already know their runner's reporter options.
- **Our own folder, `qa-report/`, set by an `outputFolder` option** (matching the HTML reporter's option): replaced; it put one more output folder beside the runner's for users to ignore, upload, and clean, when the runner already has one.
- **`playwright-report/`**: rejected; the HTML reporter deletes it when it writes.

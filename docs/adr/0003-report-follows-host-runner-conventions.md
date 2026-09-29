# The QA Report behaves like the host runner's own HTML report

A client adds the reporter line and runs their tests; nothing else. Every run produces a QA Report: a browsable HTML report (an index plus one page per test with its screenshots) and each test's QA Instructions as Jira-ready text, written automatically so it is ready to paste with no extra step. Rendering is part of the run, not a separate command.

How the report behaves copies the host runner instead of inventing our own: for Playwright, the same option names and defaults as Playwright's HTML reporter (`outputFolder`, `open: 'always' | 'never' | 'on-failure'`) and a `show-report` command like `npx playwright show-report`. A future Jest adapter follows Jest's reporter conventions. Everything a run writes lives in one output folder, default `qa-report/`, matching Playwright's `playwright-report/`.

## Considered Options

- **Bundles plus a separate render command** (the previous design): rejected; clients had to run a second command to see anything.
- **A copy button for the Jira text**: rejected; the text must already exist after the run without anyone doing anything.
- **Our own option names and auto-open behavior**: rejected; users already know their runner's reporter options.

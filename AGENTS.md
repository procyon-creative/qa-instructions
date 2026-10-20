# AGENTS.md

## Testing standard

Verification is tests under a test runner. Playwright Test for E2E checks and goldens, `node:test` for unit tests. No standalone check scripts: no `verify-*`, `run-*`, or `update-goldens` scripts that read output and `process.exit`, and no `&&` chains of runs.

- **Goldens** are Playwright snapshots: `expect(actual).toMatchSnapshot(...)` (text, Markdown, HTML, JSON, and images with `threshold` / `maxDiffPixels`, a wider tolerance for JPEG frames). `--update-snapshots` rewrites them; there is no update script. Expectations a person writes (which step, which moment, where the probe points are) stay in the test code or a spec file next to the goldens and are not regenerated. Whole screenshots differ between machines (fonts), so image snapshots cover the pixels at probe points, not a full page. A run that must match another example's goldens (`derived-steps-1.56`) compares with `toBe`, so `--update-snapshots` there can never overwrite them.
- **Ordering and variants** are Playwright projects with `dependencies` (the sample runs, then the verify project), or one config per run where a reporter option differs (a reporter is configured per run, not per project).
- **Code is TypeScript**, typechecked by each package's `build`. No `.mjs` or `.cjs` files.
- **The old scripts are not a pattern.** Reviews flag a new script that checks output instead of a test.
- Never open a browser or report from a test run (`open: 'never'`).

## Agent skills

### Issue tracker

Issues live in Jira project `QI` (procyoncreative.atlassian.net), reached through the `procyon_atlassian` MCP. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary as Jira labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

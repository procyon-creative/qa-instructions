# Verification example

Deterministic e2e for the capture → render pipeline, with only the reporter line: no render command runs.

## What it checks

1. **Unmodified test** — `tests/capture.spec.ts` is an ordinary Playwright test against a local Astro fixture site; it does not import qa-instructions
2. **Reporter** — `@procyon-creative/qa-instructions/playwright`, configured with no options, derives the QA Instructions and writes the QA Report to `test-results/qa-report/`, inside Playwright's default `outputDir`: `index.html`, and `capture--login-error-flow/` with `bundle.json`, the test's page (`qa-steps.html`), and its Jira-ready text (`qa-steps.txt`)
3. **Golden verification** — the bundle (normalized), the Jira-ready text, and the index must equal `golden/`, as Playwright Test snapshots (`e2e/qa-report.spec.ts`)

This example runs without the trace setting, so its QA Steps are text only. Step Screenshot checks live in `examples/derived-steps`.

## Run locally

```bash
pnpm --filter @qa-instructions/example-verification e2e
```

`pnpm e2e` is one Playwright Test run (`playwright.e2e.config.ts`): the `runs` project makes the sample run (`playwright.config.ts`, which writes `test-results/qa-report/`), and the `verify` project, which depends on it, checks the QA Report against `golden/`. `pnpm test` runs the sample test alone.

## Update goldens

After intentional fixture or wording changes:

```bash
pnpm e2e --update-snapshots
git add golden/
```

## Fixture site

`examples/fixture-site` serves static pages with solid-color step markers:

| Page           | Marker              | Purpose         |
| -------------- | ------------------- | --------------- |
| `/`            | Blue STEP 1 HOME    | Landing         |
| `/login`       | Orange STEP 2 LOGIN | Form            |
| `/login-error` | Red STEP 3 ERROR    | Known bad state |

Separate routes (not query params) keep Astro static output deterministic.

# Verification example

Deterministic e2e for the capture → render pipeline, with only the reporter line: no render command runs.

## What it checks

1. **Unmodified test** — `tests/capture.spec.ts` is an ordinary Playwright test against a local Astro fixture site; it does not import qa-instructions
2. **Reporter** — `@procyon-creative/qa-instructions/playwright`, configured with no options, derives the QA Instructions and writes the QA Report to `qa-report/`: `index.html`, and `capture--login-error-flow/` with `bundle.json`, the test's page (`qa-steps.html`), and its Jira-ready text (`qa-steps.txt`)
3. **Golden verification** — the bundle (normalized), the Jira-ready text, and the index must equal `golden/`

This example runs without the trace setting, so its QA Steps are text only. Step Screenshot checks live in `examples/derived-steps`.

## Run locally

```bash
pnpm --filter @qa-instructions/example-verification e2e
```

Or step by step:

```bash
pnpm test      # Playwright + fixture-site webServer; the run writes qa-report/
pnpm verify    # diff against golden/
```

## Update goldens

After intentional fixture or wording changes:

```bash
pnpm test && pnpm verify:update-goldens
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

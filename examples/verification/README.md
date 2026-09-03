# Verification example

Deterministic e2e for the collect → render pipeline.

## What it checks

1. **Playwright capture** — `qa.step()` records 3 steps against a local Astro fixture site
2. **Collector** — writes `qa-runs/capture--login-error-flow/bundle.json` + PNG assets
3. **Render** — produces pasteable `qa-steps.txt`
4. **Golden verification** — bundle shape, qa-steps text, and screenshot color probes at marker centers

## Run locally

```bash
pnpm --filter @qa-instructions/example-verification e2e
```

Or step by step:

```bash
pnpm test      # Playwright + fixture-site webServer
pnpm render    # qa-instructions render
pnpm verify    # diff against golden/
```

## Update goldens

After intentional fixture or copy changes:

```bash
pnpm test && pnpm render && pnpm verify:update-goldens
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

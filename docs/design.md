# qa-instructions — Design Spec

## Goal

Capture browser test steps and evidence agnostically during a test run, then render human-repeatable QA instructions in a separate step. Test-runner adapters only collect; renderers only transform.

## Core principle: collect → render

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Test adapter   │────▶│   QaRunBundle    │────▶│    Renderers    │
│  (Playwright…)  │     │  (canonical JSON │     │  qa-steps.txt   │
│                 │     │   + assets)      │     │  markdown       │
│  capture only   │     │                  │     │  json (passthru)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

Nothing in capture knows about Jira, Markdown, or HTML. Nothing in render knows about Playwright, Jest, or CDP.

Adding a new output format = one pure function in `@qa-instructions/core/render`. Adding a new test runner = one adapter that produces the same bundle shape.

## Canonical data: `QaRunBundle`

The bundle is the only contract between capture and render.

```typescript
interface QaRunBundle {
  version: '1';
  meta: {
    title: string;
    prerequisite?: string;
    source?: {
      runner: 'playwright' | 'jest' | 'devtools' | 'manual';
      testFile?: string;
      testTitle?: string;
      project?: string;
    };
    capturedAt: string; // ISO 8601
    status: 'complete' | 'partial' | 'failed';
  };
  steps: QaStep[];
  assets: Record<string, QaAsset>; // keyed by asset id
}

interface QaStep {
  index: number;
  action: string;
  expected?: string;
  url?: string;
  assetIds?: string[]; // references into bundle.assets
}

interface QaAsset {
  id: string;
  contentType: string;
  filename: string; // relative to bundle directory
  sha256?: string;
}
```

On disk, a bundle is a directory:

```
qa-runs/
  login-flow/
    bundle.json
    assets/
      step-01-screenshot.png
      step-02-screenshot.png
```

Renderers read `bundle.json` + resolve assets from `assets/`. No runner-specific fields in the step model.

## Layer responsibilities

### `@qa-instructions/core`

| Module | Responsibility |
|--------|----------------|
| `model/` | Types: `QaRunBundle`, `QaStep`, `QaAsset` |
| `bundle/` | `createBundle()`, `addStep()`, `addAsset()`, `finalizeBundle()` — in-memory builder |
| `bundle/io/` | `writeBundle(dir, bundle, assets)`, `readBundle(dir)` |
| `render/` | Pure transforms: `renderQaSteps(bundle) → string`, `renderMarkdown(bundle) → string` |

Render functions return strings (or `{ content, assets }` for formats that rewrite paths). They never call Playwright or touch the filesystem unless explicitly passed a bundle directory for asset path resolution.

### `@qa-instructions/playwright` (Phase 1 adapter)

**Capture side only:**

- `test.extend({ qa })` — exposes `qa.step(action, expected, fn)` and `qa.guide({ prerequisite, title })`
- Each `qa.step()`:
  1. Runs action inside `test.step()`
  2. Captures screenshot via `step.attach()` (Playwright ≥ 1.51)
  3. Appends to in-memory `QaRunBundle` builder
- After test: serializes `bundle.json` body via `testInfo.attach('qa-run-bundle', …)`

**Reporter side (collection only):**

- `QaCollectorReporter` implements Playwright `Reporter`
- On `onTestEnd`: extract `qa-run-bundle` attachment + step-scoped screenshot attachments
- Write bundle directory to configured output (default: `qa-runs/<test-id>/`)
- Does **not** call renderers

Native Playwright HTML report continues to show step attachments via built-in reporter — no custom work needed.

### `@qa-instructions/cli` (Phase 1)

Separate render step, invokable in CI after tests:

```bash
# Render all bundles collected during the run
qa-instructions render qa-runs/ --format qa-steps --out dist/qa-steps/

# Single format
qa-instructions render qa-runs/login-flow/ --format markdown --out dist/docs/
```

Also usable programmatically:

```typescript
import { readBundle, renderQaSteps } from '@qa-instructions/core';

const bundle = await readBundle('qa-runs/login-flow');
const text = renderQaSteps(bundle);
```

## Renderers (Phase 1 → 2)

| Renderer | Output | Consumer | Phase |
|----------|--------|----------|-------|
| `renderQaSteps` | Plain numbered list | Jira / ticket QA field | 1 |
| `renderMarkdown` | Markdown + `![](assets/…)` | PR artifacts, docs | 2 |
| `renderJson` | Pretty-printed bundle | Tooling, passthrough | 1 |

Phase 1 ships `renderQaSteps` and `renderJson`. Markdown is one function away once bundle format is stable.

## Playwright config (Phase 1)

```typescript
import { defineConfig } from '@qa-instructions/playwright';

export default defineConfig({
  reporter: [
    ['list'],
    ['html'],
    ['@qa-instructions/playwright/collector', { outputDir: 'qa-runs' }],
  ],
});
```

Post-test CI step:

```yaml
- run: npx qa-instructions render qa-runs/ --format qa-steps --out qa-steps-out/
- uses: actions/upload-artifact@v4
  with:
    name: qa-steps
    path: qa-steps-out/
```

## Explicit step authoring

```typescript
import { test, expect } from '@qa-instructions/playwright';

test('Create a project', async ({ qa, page }) => {
  qa.guide({
    title: 'Create a project',
    prerequisite: 'Deploy branch to dev first.',
  });

  await qa.step(
    'Open https://app.example.com/projects',
    'Project list loads with no error',
    async () => {
      await page.goto('https://app.example.com/projects');
      await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    },
  );

  await qa.step(
    'Click `New project`',
    'Dialog shows empty name field',
    async () => {
      await page.getByRole('button', { name: 'New project' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  );
});
```

## Retry and partial capture

- **Retries:** Collector uses the last test attempt's bundle attachment only.
- **Failure mid-guide:** Emit bundle with `status: 'partial'` and steps captured so far. Renderer adds no commentary — partial steps are still useful.

## Out of scope (v0.1)

- Jest adapter
- DevTools Recorder import (future CLI script, not a package)
- Jira API integration
- Auto-instrumentation of `page` methods
- Custom HTML report UI (use Playwright's native report for screenshots)

## Differentiation from docs-tests

docs-tests couples capture + Markdown render in one reporter pass. qa-instructions separates collection from render so the same run produces ticket steps, Markdown, or future formats without re-running tests. Output contract targets qa-steps skill format (terse, falsifiable, prerequisite line) rather than product documentation prose.

## Package layout

```
packages/
  core/                 # model, bundle builder, bundle I/O, renderers
  playwright/           # qa fixture + collector reporter
  cli/                  # qa-instructions render command
examples/
  basic/                # one test, demonstrates collect → render loop
```

## Success criteria

1. Run Playwright test → bundle written to `qa-runs/`
2. `qa-instructions render` → `qa-steps.txt` pasteable into Jira
3. Playwright HTML report shows per-step screenshots natively
4. Adding `renderMarkdown` requires zero changes to playwright adapter

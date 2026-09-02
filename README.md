# qa-instructions

Collect browser test steps agnostically, render human-repeatable QA instructions separately.

## Architecture

```
Test adapter (Playwright)  →  QaRunBundle (JSON + assets)  →  Renderers (qa-steps, json, …)
         capture only                  canonical data                 pure transforms
```

- **Capture** knows nothing about Jira or Markdown
- **Render** knows nothing about Playwright
- Adding an output format = one function in `@qa-instructions/core/render`
- Adding a test runner = one adapter that produces `QaRunBundle`

See [docs/design.md](./docs/design.md) for the full spec.

## Packages

| Package                       | Role                                  |
| ----------------------------- | ------------------------------------- |
| `@qa-instructions/core`       | Bundle model, builder, I/O, renderers |
| `@qa-instructions/playwright` | `qa` fixture + collector reporter     |
| `@qa-instructions/cli`        | `qa-instructions render` command      |

## Usage

### 1. Write a test

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
      await expect(
        page.getByRole('heading', { name: 'Projects' }),
      ).toBeVisible();
    },
  );
});
```

### 2. Collect bundles (Playwright config)

```typescript
export default defineConfig({
  reporter: [
    ['list'],
    ['html'],
    ['@qa-instructions/playwright/collector', { outputDir: 'qa-runs' }],
  ],
});
```

### 3. Render output (separate step)

```bash
qa-instructions render qa-runs/ --format qa-steps --out qa-steps-out/
```

Paste `qa-steps-out/*.txt` into your ticket. Screenshots stay in `qa-runs/` and the Playwright HTML report.

## CI

```yaml
- run: pnpm test
- run: qa-instructions render qa-runs/ --format qa-steps --out qa-steps-out/
- uses: actions/upload-artifact@v4
  with:
    name: qa-steps
    path: qa-steps-out/
```

## Example

```bash
cd examples/basic
pnpm install
pnpm exec playwright install chromium
pnpm test
pnpm render
```

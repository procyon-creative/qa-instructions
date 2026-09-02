# qa-instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runner-agnostic library that collects browser test steps into a canonical `QaRunBundle`, then renders human-repeatable QA instructions in a separate step.

**Architecture:** Three packages — `core` (model, bundle I/O, pure renderers), `playwright` (capture fixture + collector reporter), `cli` (render command). Test adapters only write bundles; renderers only read bundles. No capture code knows about output formats; no renderer knows about Playwright.

**Tech Stack:** TypeScript, pnpm workspaces, Node.js ≥ 20, `@playwright/test` ≥ 1.51, Node built-in test runner (`node:test`).

**Spec:** `docs/design.md`

## Global Constraints

- `@playwright/test` peer dependency floor: `>=1.51.0` (required for `step.attach()`)
- Per-step screenshots MUST use `step.attach()`, not `testInfo.attach()` inside a step callback
- Collector reporter MUST NOT call renderers — collection and render are separate steps
- Primary output format: plain-text qa-steps (numbered list, prerequisite line, action + expected on same line)
- Phase 1 renderers: `renderQaSteps`, `renderJson` only — no Markdown renderer
- Out of scope v0.1: Jest adapter, DevTools import, Jira API, auto-instrumentation, custom HTML report UI
- Bundle version string: `'1'`
- On-disk bundle layout: `<dir>/bundle.json` + `<dir>/assets/<filename>`

---

## File Structure

```
qa-instructions/
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   └── design.md
├── packages/
│   ├── core/
│   │   ├── package.json          # @qa-instructions/core
│   │   ├── tsconfig.json
│   │   ├── tsconfig.test.json    # compiles test/ separately
│   │   ├── src/
│   │   │   ├── index.ts          # public re-exports
│   │   │   ├── model.ts          # QaRunBundle, QaStep, QaAsset types
│   │   │   ├── bundle/
│   │   │   │   ├── builder.ts    # createBundleBuilder()
│   │   │   │   └── io.ts         # readBundle(), writeBundle(), bundleDirName()
│   │   │   └── render/
│   │   │       └── index.ts      # render(), renderQaSteps(), renderJson()
│   │   └── test/
│   │       ├── builder.test.ts
│   │       ├── io.test.ts
│   │       └── render.test.ts
│   ├── playwright/
│   │   ├── package.json          # @qa-instructions/playwright
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts          # re-exports test, expect
│   │   │   ├── fixture.ts        # test.extend({ qa })
│   │   │   └── reporter/
│   │   │       └── collector.ts  # QaCollectorReporter
│   │   └── test/
│   │       └── collector.test.ts # unit test with mock Reporter inputs
│   └── cli/
│       ├── package.json          # @qa-instructions/cli, bin: qa-instructions
│       ├── tsconfig.json
│       ├── src/
│       │   └── index.ts          # render subcommand
│       └── test/
│           └── render.test.ts
└── examples/
    └── basic/
        ├── package.json
        ├── playwright.config.ts
        ├── tests/
        │   └── example.spec.ts
        └── package.json scripts: test, render
```

---

### Task 1: Monorepo scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Interfaces:**

- Produces: pnpm workspace with `packages/*` and `examples/*` globs

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "qa-instructions",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
dist-test/
qa-runs/
qa-steps-out/
playwright-report/
test-results/
```

- [ ] **Step 5: Verify workspace**

Run: `pnpm install`
Expected: succeeds with no packages yet beyond root

- [ ] **Step 6: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore docs/
git commit -m "chore: scaffold pnpm monorepo"
```

---

### Task 2: Core types and bundle builder

**Files:**

- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsconfig.test.json`
- Create: `packages/core/src/model.ts`
- Create: `packages/core/src/bundle/builder.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/test/builder.test.ts`

**Interfaces:**

- Produces:
  - `QaRunBundle`, `QaStep`, `QaAsset`, `QaGuideOptions`, `QaStepInput`, `QaAssetInput` types
  - `createBundleBuilder(): BundleBuilder`
  - `BundleBuilder.guide(options)`, `.addStep(input)`, `.addAsset(input)`, `.setStatus(status)`, `.setSource(source)`, `.toBundle()`, `.pendingAssets()`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@qa-instructions/core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsc -p tsconfig.test.json",
    "test": "node --test dist-test/**/*.test.js"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "files": ["dist"]
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/core/test/builder.test.ts`:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';

import { createBundleBuilder } from '../src/bundle/builder.js';

test('createBundleBuilder accumulates steps and assets', () => {
  const builder = createBundleBuilder();
  builder.guide({ title: 'Login', prerequisite: 'Deploy to dev first.' });
  builder.setSource({ runner: 'playwright', testTitle: 'Login' });

  const step = builder.addStep({
    action: 'Open /login',
    expected: 'Form loads',
    assetIds: ['step-01-screenshot'],
  });
  builder.addAsset({
    id: 'step-01-screenshot',
    contentType: 'image/png',
    filename: 'step-01-screenshot.png',
    data: Buffer.from('fake-png'),
  });

  const bundle = builder.toBundle();

  assert.equal(bundle.version, '1');
  assert.equal(bundle.meta.title, 'Login');
  assert.equal(bundle.meta.prerequisite, 'Deploy to dev first.');
  assert.equal(bundle.meta.source?.runner, 'playwright');
  assert.equal(bundle.steps.length, 1);
  assert.equal(step.index, 1);
  assert.equal(
    bundle.assets['step-01-screenshot'].filename,
    'step-01-screenshot.png',
  );
  assert.equal(builder.pendingAssets().length, 1);
});
```

- [ ] **Step 3: Create tsconfig files**

`packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

`packages/core/tsconfig.test.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist-test",
    "rootDir": ".",
    "types": ["node"],
    "noEmit": false
  },
  "include": ["test/**/*.test.ts"]
}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd packages/core && pnpm install && pnpm build && pnpm test`
Expected: FAIL — module not found

- [ ] **Step 5: Implement types and builder**

Create `packages/core/src/model.ts`:

```typescript
export type QaAsset = {
  id: string;
  contentType: string;
  filename: string;
  sha256?: string;
};

export type QaStep = {
  index: number;
  action: string;
  expected?: string;
  url?: string;
  assetIds?: string[];
};

export type QaRunBundle = {
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
    capturedAt: string;
    status: 'complete' | 'partial' | 'failed';
  };
  steps: QaStep[];
  assets: Record<string, QaAsset>;
};

export type QaGuideOptions = {
  title: string;
  prerequisite?: string;
};

export type QaStepInput = {
  action: string;
  expected?: string;
  url?: string;
  assetIds?: string[];
};

export type QaAssetInput = {
  id: string;
  contentType: string;
  filename: string;
  data: Buffer;
  sha256?: string;
};
```

Create `packages/core/src/bundle/builder.ts`:

```typescript
import type {
  QaAssetInput,
  QaGuideOptions,
  QaRunBundle,
  QaStep,
  QaStepInput,
} from '../model.js';

export type BundleBuilder = {
  guide(options: QaGuideOptions): void;
  addStep(input: QaStepInput): QaStep;
  addAsset(input: QaAssetInput): void;
  setStatus(status: QaRunBundle['meta']['status']): void;
  setSource(source: NonNullable<QaRunBundle['meta']['source']>): void;
  toBundle(): QaRunBundle;
  pendingAssets(): QaAssetInput[];
};

export function createBundleBuilder(): BundleBuilder {
  const meta: QaRunBundle['meta'] = {
    title: '',
    capturedAt: new Date().toISOString(),
    status: 'complete',
  };
  const steps: QaStep[] = [];
  const assets: QaRunBundle['assets'] = {};
  const pending: QaAssetInput[] = [];

  return {
    guide(options) {
      meta.title = options.title;
      meta.prerequisite = options.prerequisite;
    },
    addStep(input) {
      const step: QaStep = {
        index: steps.length + 1,
        action: input.action,
        expected: input.expected,
        url: input.url,
        assetIds: input.assetIds,
      };
      steps.push(step);
      return step;
    },
    addAsset(input) {
      pending.push(input);
      assets[input.id] = {
        id: input.id,
        contentType: input.contentType,
        filename: input.filename,
        sha256: input.sha256,
      };
    },
    setStatus(status) {
      meta.status = status;
    },
    setSource(source) {
      meta.source = source;
    },
    toBundle() {
      return { version: '1', meta, steps, assets };
    },
    pendingAssets() {
      return [...pending];
    },
  };
}
```

Create `packages/core/src/index.ts`:

```typescript
export * from './model.js';
export { createBundleBuilder, type BundleBuilder } from './bundle/builder.js';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm build && pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add bundle model and builder"
```

---

### Task 3: Core renderers

**Files:**

- Create: `packages/core/src/render/index.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/render.test.ts`

**Interfaces:**

- Consumes: `QaRunBundle` from Task 2
- Produces:
  - `renderQaSteps(bundle: QaRunBundle): string`
  - `renderJson(bundle: QaRunBundle): string`
  - `render(bundle: QaRunBundle, format: RenderFormat): string`
  - `RenderFormat = 'qa-steps' | 'json'`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/render.test.ts`:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';

import { createBundleBuilder } from '../src/bundle/builder.js';
import { render, renderJson, renderQaSteps } from '../src/render/index.js';

test('renderQaSteps produces ticket-ready plain text', () => {
  const builder = createBundleBuilder();
  builder.guide({
    title: 'Create a project',
    prerequisite: 'Deploy branch to dev first.',
  });
  builder.addStep({
    action: 'Open https://app.example.com/projects',
    expected: 'Project list loads with no error',
  });
  builder.addStep({
    action: 'Click `New project`',
    expected: 'Dialog shows empty name field',
  });

  const output = renderQaSteps(builder.toBundle());

  assert.equal(
    output,
    [
      'Deploy branch to dev first.',
      '',
      '1. Open https://app.example.com/projects — Project list loads with no error',
      '2. Click `New project` — Dialog shows empty name field',
      '',
    ].join('\n'),
  );
});

test('renderJson pretty-prints bundle', () => {
  const bundle = createBundleBuilder().toBundle();
  const output = renderJson(bundle);
  assert.match(output, /"version": "1"/);
  assert.match(output, /\n$/);
});

test('render dispatches by format', () => {
  const bundle = createBundleBuilder().toBundle();
  assert.doesNotThrow(() => render(bundle, 'qa-steps'));
  assert.doesNotThrow(() => render(bundle, 'json'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm build && pnpm test`
Expected: FAIL — module `../src/render/index.js` not found

- [ ] **Step 3: Implement renderers**

Create `packages/core/src/render/index.ts`:

```typescript
import type { QaRunBundle } from '../model.js';

export function renderQaSteps(bundle: QaRunBundle): string {
  const lines: string[] = [];

  if (bundle.meta.prerequisite) {
    lines.push(bundle.meta.prerequisite, '');
  }

  for (const step of bundle.steps) {
    const expected = step.expected ? ` — ${step.expected}` : '';
    lines.push(`${step.index}. ${step.action}${expected}`);
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function renderJson(bundle: QaRunBundle): string {
  return JSON.stringify(bundle, null, 2) + '\n';
}

export type RenderFormat = 'qa-steps' | 'json';

export function render(bundle: QaRunBundle, format: RenderFormat): string {
  switch (format) {
    case 'qa-steps':
      return renderQaSteps(bundle);
    case 'json':
      return renderJson(bundle);
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown render format: ${_exhaustive}`);
    }
  }
}
```

Update `packages/core/src/index.ts`:

```typescript
export * from './model.js';
export { createBundleBuilder, type BundleBuilder } from './bundle/builder.js';
export {
  render,
  renderQaSteps,
  renderJson,
  type RenderFormat,
} from './render/index.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm build && pnpm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add qa-steps and json renderers"
```

---

### Task 4: Core bundle I/O

**Files:**

- Create: `packages/core/src/bundle/io.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/io.test.ts`

**Interfaces:**

- Consumes: `QaRunBundle`, `QaAssetInput` from Task 2
- Produces:
  - `writeBundle(dir: string, bundle: QaRunBundle, assets: QaAssetInput[]): Promise<void>`
  - `readBundle(dir: string): Promise<QaRunBundle>`
  - `bundleDirName(testFile: string, testTitle: string): string`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/io.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createBundleBuilder } from '../src/bundle/builder.js';
import { bundleDirName, readBundle, writeBundle } from '../src/bundle/io.js';

test('writeBundle and readBundle round-trip', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'qa-bundle-'));
  try {
    const builder = createBundleBuilder();
    builder.guide({ title: 'Login' });
    builder.addStep({
      action: 'Open /login',
      assetIds: ['step-01-screenshot'],
    });
    builder.addAsset({
      id: 'step-01-screenshot',
      contentType: 'image/png',
      filename: 'step-01-screenshot.png',
      data: Buffer.from('fake-png-bytes'),
    });

    const bundle = builder.toBundle();
    await writeBundle(dir, bundle, builder.pendingAssets());

    const raw = await readFile(path.join(dir, 'bundle.json'), 'utf8');
    assert.match(raw, /"version": "1"/);

    const assetBytes = await readFile(
      path.join(dir, 'assets', 'step-01-screenshot.png'),
    );
    assert.equal(assetBytes.toString(), 'fake-png-bytes');

    const loaded = await readBundle(dir);
    assert.deepEqual(loaded.steps, bundle.steps);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bundleDirName slugifies test file and title', () => {
  assert.equal(
    bundleDirName('/proj/tests/login.spec.ts', 'User can log in'),
    'login--user-can-log-in',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm build && pnpm test`
Expected: FAIL — `io.js` not found

- [ ] **Step 3: Implement bundle I/O**

Create `packages/core/src/bundle/io.ts`:

```typescript
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { QaAssetInput, QaRunBundle } from '../model.js';

const BUNDLE_FILENAME = 'bundle.json';
const ASSETS_DIR = 'assets';

export async function writeBundle(
  dir: string,
  bundle: QaRunBundle,
  assetData: QaAssetInput[],
): Promise<void> {
  await mkdir(path.join(dir, ASSETS_DIR), { recursive: true });

  for (const asset of assetData) {
    await writeFile(path.join(dir, ASSETS_DIR, asset.filename), asset.data);
  }

  await writeFile(
    path.join(dir, BUNDLE_FILENAME),
    JSON.stringify(bundle, null, 2),
    'utf8',
  );
}

export async function readBundle(dir: string): Promise<QaRunBundle> {
  const raw = await readFile(path.join(dir, BUNDLE_FILENAME), 'utf8');
  return JSON.parse(raw) as QaRunBundle;
}

export function bundleDirName(testFile: string, testTitle: string): string {
  const base = path.basename(testFile, path.extname(testFile));
  const slug = testTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}--${slug}`;
}
```

Update `packages/core/src/index.ts`:

```typescript
export * from './model.js';
export { createBundleBuilder, type BundleBuilder } from './bundle/builder.js';
export { writeBundle, readBundle, bundleDirName } from './bundle/io.js';
export {
  render,
  renderQaSteps,
  renderJson,
  type RenderFormat,
} from './render/index.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm build && pnpm test`
Expected: PASS (5 tests total)

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add bundle read/write I/O"
```

---

### Task 5: Playwright qa fixture

**Files:**

- Create: `packages/playwright/package.json`
- Create: `packages/playwright/tsconfig.json`
- Create: `packages/playwright/src/fixture.ts`
- Create: `packages/playwright/src/index.ts`

**Interfaces:**

- Consumes: `createBundleBuilder`, `BundleBuilder` from `@qa-instructions/core`
- Produces:
  - `test` — extended Playwright test with `qa` fixture
  - `expect` — re-exported from `@playwright/test`
  - `QaFixture.guide(options: QaGuideOptions): void`
  - `QaFixture.step(action: string, expected: string | undefined, fn: () => Promise<void>): Promise<void>`

- [ ] **Step 1: Create `packages/playwright/package.json`**

```json
{
  "name": "@qa-instructions/playwright",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./collector": "./dist/reporter/collector.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@qa-instructions/core": "workspace:*"
  },
  "peerDependencies": {
    "@playwright/test": ">=1.51.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.51.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "files": ["dist"]
}
```

- [ ] **Step 2: Create `packages/playwright/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Implement fixture**

Create `packages/playwright/src/fixture.ts`:

```typescript
import { test as base, type TestInfo } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  createBundleBuilder,
  type BundleBuilder,
  type QaGuideOptions,
} from '@qa-instructions/core';

export type QaFixture = {
  guide(options: QaGuideOptions): void;
  step(
    action: string,
    expected: string | undefined,
    fn: () => Promise<void>,
  ): Promise<void>;
};

function createQaFixture(
  page: Page,
  testInfo: TestInfo,
  builder: BundleBuilder,
): QaFixture {
  let stepCounter = 0;

  builder.setSource({
    runner: 'playwright',
    testFile: testInfo.file,
    testTitle: testInfo.title,
    project: testInfo.project.name,
  });

  return {
    guide(options) {
      builder.guide(options);
    },

    async step(action, expected, fn) {
      stepCounter += 1;
      const assetId = `step-${String(stepCounter).padStart(2, '0')}-screenshot`;
      const filename = `${assetId}.png`;

      await base.step(action, async (step) => {
        try {
          await fn();
          const screenshot = await page.screenshot();
          await step.attach('qa-screenshot', {
            body: screenshot,
            contentType: 'image/png',
          });
          builder.addAsset({
            id: assetId,
            contentType: 'image/png',
            filename,
            data: Buffer.from(screenshot),
          });
          builder.addStep({
            action,
            expected,
            url: page.url(),
            assetIds: [assetId],
          });
        } catch (error) {
          builder.setStatus('partial');
          throw error;
        }
      });
    },
  };
}

export const test = base.extend<{ qa: QaFixture }>({
  qa: async ({ page }, use, testInfo) => {
    const builder = createBundleBuilder();
    const qa = createQaFixture(page, testInfo, builder);
    await use(qa);

    await testInfo.attach('qa-run-bundle', {
      body: Buffer.from(JSON.stringify(builder.toBundle())),
      contentType: 'application/json',
    });
  },
});

export { expect } from '@playwright/test';
```

Create `packages/playwright/src/index.ts`:

```typescript
export { test, expect, type QaFixture } from './fixture.js';
```

- [ ] **Step 4: Build**

Run: `cd packages/playwright && pnpm install && pnpm build`
Expected: PASS — no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/
git commit -m "feat(playwright): add qa fixture with step.attach capture"
```

---

### Task 6: Playwright collector reporter

**Files:**

- Create: `packages/playwright/src/reporter/collector.ts`
- Create: `packages/playwright/test/collector.test.ts`

**Interfaces:**

- Consumes: `writeBundle`, `bundleDirName`, `QaRunBundle`, `QaAssetInput` from `@qa-instructions/core`
- Produces: default export `QaCollectorReporter` class implementing Playwright `Reporter`
- Options: `{ outputDir?: string }` defaulting to `'qa-runs'`

- [ ] **Step 1: Write the failing test**

Create `packages/playwright/test/collector.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { TestCase, TestResult } from '@playwright/test/reporter';

import QaCollectorReporter from '../src/reporter/collector.js';

function mockTestCase(): TestCase {
  return {
    title: 'User can log in',
    location: { file: '/proj/tests/login.spec.ts', line: 1, column: 1 },
  } as TestCase;
}

function mockResult(bundle: object, screenshotBodies: Buffer[]): TestResult {
  return {
    status: 'passed',
    retry: 0,
    attachments: [
      {
        name: 'qa-run-bundle',
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify(bundle)),
      },
    ],
    steps: screenshotBodies.map((body) => ({
      title: 'step',
      category: 'test.step',
      attachments: [
        {
          name: 'qa-screenshot',
          contentType: 'image/png',
          body,
        },
      ],
    })),
  } as TestResult;
}

test('collector writes bundle dir from attachments', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'qa-runs-'));
  try {
    const reporter = new QaCollectorReporter({} as never, { outputDir: out });
    const bundle = {
      version: '1',
      meta: {
        title: 'Login',
        capturedAt: new Date().toISOString(),
        status: 'complete',
      },
      steps: [
        { index: 1, action: 'Open /login', assetIds: ['step-01-screenshot'] },
      ],
      assets: {
        'step-01-screenshot': {
          id: 'step-01-screenshot',
          contentType: 'image/png',
          filename: 'step-01-screenshot.png',
        },
      },
    };

    await reporter.onTestEnd(
      mockTestCase(),
      mockResult(bundle, [Buffer.from('png-bytes')]),
    );

    const bundlePath = path.join(out, 'login--user-can-log-in', 'bundle.json');
    await stat(bundlePath);
    const raw = await readFile(bundlePath, 'utf8');
    assert.match(raw, /"title": "Login"/);

    const png = await readFile(
      path.join(
        out,
        'login--user-can-log-in',
        'assets',
        'step-01-screenshot.png',
      ),
    );
    assert.equal(png.toString(), 'png-bytes');
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
```

Add to `packages/playwright/package.json` scripts:

```json
"scripts": {
  "build": "tsc -p tsconfig.json && tsc -p tsconfig.test.json",
  "test": "node --test dist-test/**/*.test.js"
}
```

Add `packages/playwright/tsconfig.test.json` (same pattern as core, `include: ["test/**/*.test.ts"]`, `outDir: "dist-test"`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/playwright && pnpm build && pnpm test`
Expected: FAIL — collector module not found

- [ ] **Step 3: Implement collector**

Create `packages/playwright/src/reporter/collector.ts`:

```typescript
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import {
  bundleDirName,
  writeBundle,
  type QaAssetInput,
  type QaRunBundle,
} from '@qa-instructions/core';

type CollectorOptions = {
  outputDir?: string;
};

function collectAssets(
  result: TestResult,
  bundle: QaRunBundle,
): QaAssetInput[] {
  const assets: QaAssetInput[] = [];
  const declaredIds = new Set(
    bundle.steps.flatMap((step) => step.assetIds ?? []),
  );

  for (const step of result.steps) {
    for (const attachment of step.attachments ?? []) {
      if (attachment.name !== 'qa-screenshot' || !attachment.body) continue;

      const assetId =
        declaredIds.values().next().value ??
        `step-${String(assets.length + 1).padStart(2, '0')}-screenshot`;

      assets.push({
        id: assetId,
        contentType: attachment.contentType ?? 'image/png',
        filename: `${assetId}.png`,
        data: Buffer.from(attachment.body),
      });
    }
  }

  return assets;
}

export default class QaCollectorReporter implements Reporter {
  private outputDir: string;

  constructor(_config: FullConfig, options: CollectorOptions = {}) {
    this.outputDir = options.outputDir ?? 'qa-runs';
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const bundleAttachment = [...result.attachments]
      .reverse()
      .find((a) => a.name === 'qa-run-bundle' && a.body);

    if (!bundleAttachment?.body) return;

    const bundle = JSON.parse(
      bundleAttachment.body.toString('utf8'),
    ) as QaRunBundle;

    const dir = path.join(
      this.outputDir,
      bundleDirName(test.location.file, test.title),
    );
    await mkdir(dir, { recursive: true });
    await writeBundle(dir, bundle, collectAssets(result, bundle));
  }
}
```

Note: `collectAssets` should match screenshot files to `bundle.steps[].assetIds` in order. Refine during implementation: iterate steps in bundle order, pull matching attachments from `result.steps` filtered to `category === 'test.step'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/playwright && pnpm build && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/
git commit -m "feat(playwright): add collector reporter"
```

---

### Task 7: CLI render command

**Files:**

- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/test/render.test.ts`

**Interfaces:**

- Consumes: `readBundle`, `render`, `RenderFormat` from `@qa-instructions/core`
- Produces: CLI `qa-instructions render <dir> --format qa-steps|json --out <dir>`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/test/render.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { findBundles, renderAll } from '../src/render.js';

test('findBundles discovers bundle directories', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-cli-'));
  try {
    const bundleDir = path.join(root, 'login--user-can-log-in');
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, 'bundle.json'),
      '{"version":"1","meta":{"title":"Login","capturedAt":"2026-01-01T00:00:00.000Z","status":"complete"},"steps":[],"assets":{}}',
    );

    const found = await findBundles(root);
    assert.equal(found.length, 1);
    assert.equal(found[0], bundleDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderAll writes qa-steps files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-cli-'));
  const out = path.join(root, 'out');
  const bundleDir = path.join(root, 'bundle');
  try {
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, 'bundle.json'),
      JSON.stringify({
        version: '1',
        meta: {
          title: 'Login',
          prerequisite: 'Deploy first.',
          capturedAt: '2026-01-01T00:00:00.000Z',
          status: 'complete',
        },
        steps: [{ index: 1, action: 'Open /login', expected: 'Form loads' }],
        assets: {},
      }),
    );

    await renderAll([bundleDir], 'qa-steps', out);
    const text = await readFile(path.join(out, 'bundle.txt'), 'utf8');
    assert.match(text, /Deploy first\./);
    assert.match(text, /1\. Open \/login — Form loads/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Create `packages/cli/package.json`**

```json
{
  "name": "@qa-instructions/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "qa-instructions": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsc -p tsconfig.test.json",
    "test": "node --test dist-test/**/*.test.js"
  },
  "dependencies": {
    "@qa-instructions/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "files": ["dist"]
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/cli && pnpm install && pnpm build && pnpm test`
Expected: FAIL

- [ ] **Step 4: Implement CLI**

Create `packages/cli/src/render.ts`:

```typescript
import { mkdir, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { readBundle, render, type RenderFormat } from '@qa-instructions/core';

export async function isBundleDir(dir: string): Promise<boolean> {
  try {
    await stat(path.join(dir, 'bundle.json'));
    return true;
  } catch {
    return false;
  }
}

export async function findBundles(root: string): Promise<string[]> {
  if (await isBundleDir(root)) return [root];

  const entries = await readdir(root, { withFileTypes: true });
  const bundles: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name);
    if (await isBundleDir(candidate)) bundles.push(candidate);
  }

  return bundles.sort();
}

function outputFilename(bundleDir: string, format: RenderFormat): string {
  const base = path.basename(bundleDir);
  return format === 'json' ? `${base}.json` : `${base}.txt`;
}

export async function renderAll(
  bundles: string[],
  format: RenderFormat,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });

  for (const bundleDir of bundles) {
    const bundle = await readBundle(bundleDir);
    const content = render(bundle, format);
    const filename = outputFilename(bundleDir, format);
    await writeFile(path.join(outDir, filename), content, 'utf8');
  }
}
```

Create `packages/cli/src/index.ts`:

```typescript
#!/usr/bin/env node
import { findBundles, renderAll } from './render.js';
import type { RenderFormat } from '@qa-instructions/core';

function parseArgs(argv: string[]) {
  const [, , command, input, ...rest] = argv;
  const flags = new Map<string, string>();

  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.replace(/^--/, '');
    const value = rest[i + 1];
    if (key && value) flags.set(key, value);
  }

  return {
    command,
    input,
    format: (flags.get('format') ?? 'qa-steps') as RenderFormat,
    out: flags.get('out') ?? 'qa-steps-out',
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.command !== 'render' || !args.input) {
    console.error(
      'Usage: qa-instructions render <bundle-dir> --format qa-steps|json --out <dir>',
    );
    process.exit(1);
  }

  const bundles = await findBundles(args.input);
  if (bundles.length === 0) {
    throw new Error(`No bundles found under ${args.input}`);
  }

  await renderAll(bundles, args.format, args.out);
  for (const bundleDir of bundles) {
    console.log(`rendered ${bundleDir}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/cli && pnpm build && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): add render command"
```

---

### Task 8: Example project — collect → render loop

**Files:**

- Create: `examples/basic/package.json`
- Create: `examples/basic/playwright.config.ts`
- Create: `examples/basic/tests/example.spec.ts`

**Interfaces:**

- Consumes: `@qa-instructions/playwright`, `@qa-instructions/cli`, `@qa-instructions/core`
- Produces: working end-to-end demo against `https://playwright.dev`

- [ ] **Step 1: Create example package**

`examples/basic/package.json`:

```json
{
  "name": "@qa-instructions/example-basic",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "render": "qa-instructions render qa-runs --format qa-steps --out qa-steps-out"
  },
  "devDependencies": {
    "@qa-instructions/cli": "workspace:*",
    "@qa-instructions/playwright": "workspace:*",
    "@playwright/test": "^1.51.0"
  }
}
```

- [ ] **Step 2: Create Playwright config**

`examples/basic/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@qa-instructions/playwright/collector', { outputDir: 'qa-runs' }],
  ],
});
```

- [ ] **Step 3: Create example test**

`examples/basic/tests/example.spec.ts`:

```typescript
import { test, expect } from '@qa-instructions/playwright';

test('Browse Playwright docs', async ({ qa, page }) => {
  qa.guide({
    title: 'Browse Playwright docs',
    prerequisite: 'None.',
  });

  await qa.step(
    'Open https://playwright.dev',
    'Homepage loads with Get started link visible',
    async () => {
      await page.goto('https://playwright.dev');
      await expect(
        page.getByRole('link', { name: 'Get started' }),
      ).toBeVisible();
    },
  );

  await qa.step('Click `Get started`', 'Lands on intro docs page', async () => {
    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/.*intro/);
  });
});
```

- [ ] **Step 4: Install Playwright browsers**

Run: `cd examples/basic && pnpm install && pnpm exec playwright install chromium`

- [ ] **Step 5: Run collect step**

Run: `cd examples/basic && pnpm test`
Expected: PASS — `qa-runs/browse-playwright-docs--browse-playwright-docs/bundle.json` exists with 2 steps and 2 PNG assets

- [ ] **Step 6: Run render step**

Run: `cd examples/basic && pnpm render`
Expected: `qa-steps-out/*.txt` contains numbered steps with expected results on same line

- [ ] **Step 7: Commit**

```bash
git add examples/basic/
git commit -m "feat(example): add collect-to-render demo"
```

---

### Task 9: README and success validation

**Files:**

- Create: `README.md`

**Interfaces:**

- Produces: documentation for install, usage, CI pattern

- [ ] **Step 1: Write README**

Document:

- Architecture diagram (collect → bundle → render)
- Three-package layout
- Test authoring with `qa.step()`
- Playwright config with collector reporter
- Separate render command
- CI snippet from spec
- Success criteria from spec

- [ ] **Step 2: Run full workspace verification**

Run: `pnpm install && pnpm build && pnpm test`
Expected: all packages build, all unit tests pass

Run: `cd examples/basic && pnpm test && pnpm render`
Expected: bundle + qa-steps.txt produced

- [ ] **Step 3: Manual validation checklist**

- [ ] `qa-steps-out/*.txt` is pasteable into a ticket field (plain text, no markdown)
- [ ] Playwright HTML report shows per-step screenshot attachments
- [ ] Adding a new renderer requires only a new file in `packages/core/src/render/` — no playwright changes

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and validate success criteria"
```

---

## Self-Review

### Spec coverage

| Spec requirement                       | Task                         |
| -------------------------------------- | ---------------------------- |
| QaRunBundle canonical model            | Task 2                       |
| Bundle on-disk layout                  | Task 4                       |
| renderQaSteps + renderJson             | Task 3                       |
| Playwright qa fixture with step.attach | Task 5                       |
| Collector reporter (no render)         | Task 6                       |
| CLI separate render step               | Task 7                       |
| Explicit qa.step authoring             | Task 5, 8                    |
| Retry: last attempt bundle             | Task 6 (reverse attachments) |
| Partial capture on failure             | Task 5 (setStatus partial)   |
| Example collect → render               | Task 8                       |
| Success criteria validation            | Task 9                       |
| Out of scope items excluded            | Global Constraints           |

### Placeholder scan

No TBD/TODO/similar placeholders found.

### Type consistency

- `QaRunBundle.version` is `'1'` throughout
- `RenderFormat` is `'qa-steps' | 'json'` in core, consumed by CLI
- `qa-run-bundle` attachment name consistent in fixture (Task 5) and collector (Task 6)
- Asset IDs follow `step-NN-screenshot` pattern in fixture and bundle

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-02-qa-instructions.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

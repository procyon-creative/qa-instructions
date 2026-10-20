import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

// Records the reporter steps a Playwright version gives each test, as the
// committed step dumps in this directory. Run by
// `pnpm record-fixtures` in examples/derived-steps-1.56. Keeps the fields
// the adapter reads; source locations keep only the file name, so the dumps
// resolve against the spec copies next to them.

const FIELDS = ['title', 'category', 'subtitle', 'params', 'location'] as const;

interface StepDump {
  [field: string]: unknown;
  steps?: StepDump[];
}

function dump(step: TestStep): StepDump {
  const out: StepDump = {};
  const fields = step as unknown as Record<string, unknown>;
  for (const field of FIELDS) {
    if (fields[field] !== undefined) out[field] = fields[field];
  }
  if (step.location) {
    out.location = {
      ...step.location,
      file: path.basename(step.location.file),
    };
  }
  if (step.error) out.error = { message: step.error.message ?? '' };
  if (step.steps.length > 0) out.steps = step.steps.map(dump);
  return out;
}

export default class StepDumpReporter implements Reporter {
  private readonly outputDir: string;

  constructor({ outputDir }: { outputDir: string }) {
    this.outputDir = outputDir;
  }

  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    mkdirSync(this.outputDir, { recursive: true });
    const name = test.title.toLowerCase().replace(/\W+/g, '-');
    const file = path.join(this.outputDir, `${name}.json`);
    const steps = result.steps.map(dump);
    writeFileSync(
      file,
      `${JSON.stringify({ title: test.title, steps }, null, 2)}\n`,
    );
  }
}

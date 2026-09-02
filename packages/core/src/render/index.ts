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

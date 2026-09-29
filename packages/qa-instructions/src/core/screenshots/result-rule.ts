/** Which QA Steps get a Result Screenshot unless an override says otherwise. */
export const RESULT_SCREENSHOT_STEPS = ['last', 'every', 'none'] as const;

export type ResultScreenshotSteps = (typeof RESULT_SCREENSHOT_STEPS)[number];

/**
 * What one QA Step shows: its Step Screenshot only (`action`), its Result
 * Screenshot only (`result`), or the Step Screenshot then the Result
 * Screenshot (`both`).
 */
export const STEP_SCREENSHOTS = ['action', 'result', 'both'] as const;

export type StepScreenshots = (typeof STEP_SCREENSHOTS)[number];

/**
 * Chooses the screenshots for the QA Steps whose text matches: a string
 * found anywhere in the step's Action as the tester reads it (e.g.
 * `Click the Submit button`), or a regular expression tested against it.
 */
export type StepScreenshotOverride = {
  match: string | RegExp;
  screenshots: StepScreenshots;
};

export type ResultScreenshotOptions =
  | ResultScreenshotSteps
  | {
      /** Default `last`. */
      steps?: ResultScreenshotSteps;
      /** Checked in order; the first that matches a step decides for it. */
      overrides?: StepScreenshotOverride[];
    };

/** A QA Step as the rule sees it. */
export type ResultScreenshotStep = {
  /** The step's Action as the tester reads it, without markup. */
  action: string;
  /** The step is the last of its QA Instructions. */
  last: boolean;
};

/**
 * Decides which screenshots each QA Step shows. By default only the last
 * QA Step gets a Result Screenshot, since the next step's Step Screenshot
 * already shows the result of every other one. The rule can give one to
 * every step or none, and an override matched by step text decides for a
 * single step, whatever the rule says.
 */
export class ResultScreenshotRule {
  static readonly DEFAULT: ResultScreenshotSteps = 'last';

  private readonly steps: ResultScreenshotSteps;
  private readonly overrides: readonly StepScreenshotOverride[];

  /** Throws on a value it does not know, naming it. */
  constructor(options: ResultScreenshotOptions = {}) {
    if (typeof options !== 'string' && !this.isObject(options)) {
      throw this.invalid(options);
    }
    const { steps, overrides } =
      typeof options === 'string' ? { steps: options, overrides: [] } : options;
    if (steps !== undefined && !this.isSteps(steps)) {
      throw this.invalid(steps, 'steps');
    }
    if (overrides !== undefined && !Array.isArray(overrides)) {
      throw this.invalid(overrides, 'overrides');
    }
    for (const override of overrides ?? []) this.checkOverride(override);
    this.steps = steps ?? ResultScreenshotRule.DEFAULT;
    this.overrides = overrides ?? [];
  }

  screenshots(step: ResultScreenshotStep): StepScreenshots {
    const override = this.overrides.find(({ match }) =>
      typeof match === 'string'
        ? step.action.includes(match)
        : step.action.search(match) >= 0,
    );
    if (override) return override.screenshots;
    const result =
      this.steps === 'every' || (this.steps === 'last' && step.last);
    return result ? 'both' : 'action';
  }

  private checkOverride(override: unknown): void {
    if (!this.isObject(override)) throw this.invalid(override, 'overrides');
    const { match, screenshots } = override;
    if (typeof match !== 'string' && !(match instanceof RegExp)) {
      throw this.invalid(match, 'overrides[].match');
    }
    if (!(STEP_SCREENSHOTS as readonly unknown[]).includes(screenshots)) {
      throw this.invalid(screenshots, 'overrides[].screenshots');
    }
  }

  private isSteps(value: unknown): value is ResultScreenshotSteps {
    return (RESULT_SCREENSHOT_STEPS as readonly unknown[]).includes(value);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private invalid(value: unknown, key?: string): Error {
    const name = key ? `resultScreenshots.${key}` : 'resultScreenshots';
    return new Error(`unknown ${name} value ${JSON.stringify(value)}`);
  }
}

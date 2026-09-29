import type { QaScreenshotMoment } from '../model.js';
import type { ActionCapture, CheckCapture, Screenshot } from './source.js';

/** Most faithful first: the moment of the Action, then its result, then the page before it. */
const PREFERENCE: readonly QaScreenshotMoment[] = ['action', 'after', 'before'];

/** Chooses the Step Screenshot for an Action from what was captured. */
export class StepScreenshotPicker {
  pick(screenshots: readonly Screenshot[]): Screenshot | undefined {
    for (const moment of PREFERENCE) {
      const screenshot = screenshots.find((s) => s.moment === moment);
      if (screenshot) return screenshot;
    }
    return undefined;
  }
}

/**
 * Chooses a QA Step's Result Screenshot: the page as the last of its checks
 * that was pictured found it, since that check has just confirmed what the
 * Expected Result describes; for a step with no such check, the page once
 * its last Action was done.
 */
export class ResultScreenshotPicker {
  pick(
    action: ActionCapture | undefined,
    checks: readonly (CheckCapture | undefined)[],
  ): Screenshot | undefined {
    const checked = [...checks]
      .reverse()
      .find((check) => check?.result !== undefined);
    return checked?.result ?? action?.result;
  }
}

import open from 'open';

import type { BrowserOpener } from '../core/index.js';

/**
 * Opens a file in the default browser with `open`, the library Playwright
 * uses to open its HTML report.
 */
export const openInBrowser: BrowserOpener = (file) => open(file);

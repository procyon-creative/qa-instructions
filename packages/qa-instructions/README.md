# @procyon-creative/qa-instructions

Turns what your existing Playwright tests already do into QA Instructions: steps a person can follow by hand to check the same thing, with a screenshot per step. Tests are not changed.

```bash
npm install -D @procyon-creative/qa-instructions
```

Add the reporter to `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list'], ['@procyon-creative/qa-instructions/playwright']],
  use: {
    // Step Screenshots. Playwright 1.63+:
    trace: { mode: 'on', snapshots: { screen: true, dom: true } },
    // Playwright 1.53–1.62: trace: 'on',
  },
});
```

Run your tests as usual. Every run leaves a QA Report in `test-results/qa-report/` (inside Playwright's `outputDir`): open `index.html` to browse every test's QA Instructions with screenshots, and paste each test's Jira-ready `qa-steps.txt` into its ticket. No second command is needed.

Reporter options, the QA Report layout, and the `render` command are documented in the [project README](https://github.com/procyon-creative/qa-instructions#readme).

## License

ISC

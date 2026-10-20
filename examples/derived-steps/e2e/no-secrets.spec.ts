import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { OUTPUT_DIRS, SECRETS, root } from './reports.ts';

// No file the main run wrote (saved data, assets, rendered text) holds a
// secret: what login.spec.ts types into a password field, or a value
// matching the config's `mask` pattern.
for (const dir of OUTPUT_DIRS) {
  test(`no file under ${dir} holds a secret`, async () => {
    const entries = await readdir(path.join(root, dir), {
      recursive: true,
      withFileTypes: true,
    });
    const files = entries.filter((entry) => entry.isFile());
    expect(files.length, 'files to scan').toBeGreaterThan(0);
    for (const entry of files) {
      const file = path.join(entry.parentPath, entry.name);
      const text = await readFile(file, 'latin1');
      for (const secret of SECRETS) {
        expect(
          text.includes(secret),
          `${path.relative(root, file)} contains the secret "${secret}"`,
        ).toBe(false);
      }
    }
  });
}

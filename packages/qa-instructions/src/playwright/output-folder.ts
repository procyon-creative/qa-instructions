import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Where the QA Report goes, resolved the way Playwright's HTML reporter
 * resolves its `outputFolder`: a configured folder against the config
 * file's directory, and the default beside the package.json nearest to it
 * (as `playwright-report/` is), else in the working directory.
 */
export class PlaywrightOutputFolder {
  static readonly DEFAULT = 'qa-report';

  constructor(private readonly configured?: string) {}

  /** The folder's absolute path; `configFile` is `FullConfig.configFile`. */
  resolve(configFile: string | undefined): string {
    const configDir = configFile ? path.dirname(configFile) : process.cwd();
    if (this.configured) return path.resolve(configDir, this.configured);
    return path.resolve(
      this.packageDir(configDir) ?? process.cwd(),
      PlaywrightOutputFolder.DEFAULT,
    );
  }

  private packageDir(from: string): string | undefined {
    for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
      if (existsSync(path.join(dir, 'package.json'))) return dir;
      if (path.dirname(dir) === dir) return undefined;
    }
  }
}

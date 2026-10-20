import { spawn } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface RunOptions {
  /** Names the run in its log. */
  name: string;
  /** The example directory the run starts in. */
  cwd: string;
  /** The Playwright config of the sample run, relative to `cwd`. */
  config: string;
  /** Environment the sample run adds to this process's. */
  env?: Record<string, string>;
  /**
   * Run as a CI run: `CI=1`, no coding-agent variables (only CI may keep the
   * QA Report closed by default), and stand-ins for the commands a browser is
   * opened with, which record any call in `RunResult.opened`.
   */
  asCi?: boolean;
}

export interface RunResult {
  name: string;
  /** The exit status, or null when the run was killed by a signal. */
  status: number | null;
  stdout: string;
  stderr: string;
  /** Calls to `open` or `xdg-open` made during the run. */
  opened: string[];
}

/**
 * One sample run: a nested `playwright test` the verification project
 * starts, because a QA Report is written when its run ends and so can only
 * be read by a later run.
 */
export class PlaywrightRun {
  private static readonly OPEN_COMMANDS = ['open', 'xdg-open'];
  private static readonly AGENT_VARIABLES = ['CLAUDECODE', 'COPILOT_CLI'];

  private readonly options: RunOptions;

  constructor(options: RunOptions) {
    this.options = options;
  }

  async execute(): Promise<RunResult> {
    const shims = this.options.asCi ? await this.installOpenShims() : undefined;
    try {
      const env = this.environment(shims?.dir);
      const output = await this.spawn(env);
      const opened = shims ? await this.openedBrowsers(shims.log) : [];
      return { name: this.options.name, ...output, opened };
    } finally {
      if (shims) await rm(shims.dir, { recursive: true, force: true });
    }
  }

  private environment(shimsDir: string | undefined): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, ...this.options.env };
    // The outer Playwright worker's own plumbing must not reach this run.
    for (const key of Object.keys(env)) {
      if (key.startsWith('PW_TEST_') || key.endsWith('_WORKER_INDEX')) {
        delete env[key];
      }
    }
    if (!this.options.asCi) return env;
    env.CI = '1';
    for (const key of PlaywrightRun.AGENT_VARIABLES) delete env[key];
    env.PATH = `${shimsDir}${path.delimiter}${env.PATH}`;
    return env;
  }

  private spawn(
    env: NodeJS.ProcessEnv,
  ): Promise<Pick<RunResult, 'status' | 'stdout' | 'stderr'>> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'pnpm',
        ['exec', 'playwright', 'test', '-c', this.options.config],
        { cwd: this.options.cwd, env },
      );
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
  }

  private async installOpenShims(): Promise<{ dir: string; log: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'qa-open-shims-'));
    const log = path.join(dir, 'opened.log');
    for (const command of PlaywrightRun.OPEN_COMMANDS) {
      const file = path.join(dir, command);
      await writeFile(file, `#!/bin/sh\necho "${command} $*" >> "${log}"\n`);
      await chmod(file, 0o755);
    }
    return { dir, log };
  }

  private async openedBrowsers(log: string): Promise<string[]> {
    const text = await readFile(log, 'utf8').catch(() => '');
    return text.split('\n').filter(Boolean);
  }
}

/** Where runs leave their results for the tests that verify them. */
export class RunLog {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  async write(result: RunResult): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(result.name), JSON.stringify(result, null, 2));
  }

  async read(name: string): Promise<RunResult> {
    return JSON.parse(await readFile(this.file(name), 'utf8')) as RunResult;
  }

  private file(name: string): string {
    return path.join(this.dir, `${name.replace(/\W+/g, '-')}.json`);
  }
}

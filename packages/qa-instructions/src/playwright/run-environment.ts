type Env = Record<string, string | undefined>;

export type RunEnvironmentFacts = {
  /** The run is on a CI server. */
  ci: boolean;
  /** Someone is at a terminal who could look at an opened browser. */
  interactive: boolean;
  /** How to run a package's binary: `npx`, `pnpm exec`, or `yarn`. */
  execCommand?: string;
  /** The directory paths are shown relative to. */
  cwd?: string;
};

/**
 * What the process running the tests tells about where it runs, read the way
 * Playwright's HTML reporter reads it: CI from `CI`, a person at the
 * terminal from standard input being a TTY and no coding agent
 * (`CLAUDECODE`, `COPILOT_CLI`) driving it, and the package manager from
 * `npm_config_user_agent`.
 */
export class RunEnvironment {
  readonly ci: boolean;
  readonly interactive: boolean;
  readonly execCommand: string;
  readonly cwd: string;

  constructor(facts: RunEnvironmentFacts) {
    this.ci = facts.ci;
    this.interactive = facts.interactive;
    this.execCommand = facts.execCommand ?? 'npx';
    this.cwd = facts.cwd ?? process.cwd();
  }

  static fromProcess(
    env: Env = process.env,
    stdin: { isTTY?: boolean } = process.stdin,
  ): RunEnvironment {
    const codingAgent = Boolean(env.CLAUDECODE || env.COPILOT_CLI);
    return new RunEnvironment({
      ci: Boolean(env.CI),
      interactive: Boolean(stdin.isTTY) && !codingAgent,
      execCommand: RunEnvironment.execCommandFor(
        env.npm_config_user_agent ?? '',
      ),
    });
  }

  private static execCommandFor(userAgent: string): string {
    if (userAgent.includes('yarn')) return 'yarn';
    if (userAgent.includes('pnpm')) return 'pnpm exec';
    return 'npx';
  }
}

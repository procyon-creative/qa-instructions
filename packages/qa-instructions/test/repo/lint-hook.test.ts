import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Tests run from dist-test/test/repo/, five levels below the repository root.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
);

const UNFORMATTED_MJS = 'export const answer   =   42\n';
const FORMATTED_MJS = 'export const answer = 42;\n';
const UNFORMATTED_JSON = '{"a":1,   "b":2}\n';
const UNUSED_VARIABLE_MJS = 'const unused = 1;\n';

/** Files the hook needs to behave as it does in the real repository. */
const SHARED_FILES = [
  'package.json',
  'eslint.config.js',
  '.prettierrc',
  '.prettierignore',
  '.gitignore',
  path.join('.husky', 'pre-commit'),
];

function git(cwd: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
}

/**
 * A scratch git repository holding this repository's lint configuration and
 * hook, with one committed, clean file. `commit()` runs the pre-commit hook
 * exactly as git would (`sh .husky/pre-commit`) and reports its exit status.
 */
async function withHookRepo(
  run: (repo: {
    root: string;
    write(file: string, content: string): Promise<void>;
    stage(...files: string[]): void;
    runHook(): { status: number | null; output: string };
  }) => Promise<void>,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-lint-hook-'));
  try {
    await mkdir(path.join(root, '.husky'));
    for (const file of SHARED_FILES) {
      await copyFile(path.join(repoRoot, file), path.join(root, file));
    }
    await symlink(
      path.join(repoRoot, 'node_modules'),
      path.join(root, 'node_modules'),
    );
    git(root, 'init', '--quiet');
    await writeFile(path.join(root, 'clean.mjs'), FORMATTED_MJS);
    git(root, 'add', '.');
    git(
      root,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--quiet',
      '--no-verify',
      '-m',
      'initial',
    );
    await run({
      root,
      write: (file, content) => writeFile(path.join(root, file), content),
      stage: (...files) => git(root, 'add', '--', ...files),
      runHook: () => {
        const result = spawnSync('sh', ['.husky/pre-commit'], {
          cwd: root,
          encoding: 'utf8',
          // pnpm must not try to install into the scratch repo.
          env: { ...process.env, npm_config_verify_deps_before_run: 'false' },
        });
        return {
          status: result.status,
          output: `${result.stdout}${result.stderr}`,
        };
      },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('the hook rejects a staged .mjs file that Prettier would reject', async () => {
  await withHookRepo(async (repo) => {
    await repo.write('scripts.mjs', UNFORMATTED_MJS);
    repo.stage('scripts.mjs');
    assert.notEqual(repo.runHook().status, 0);
  });
});

test('the hook rejects a staged .json file that Prettier would reject', async () => {
  await withHookRepo(async (repo) => {
    await repo.write('data.json', UNFORMATTED_JSON);
    repo.stage('data.json');
    assert.notEqual(repo.runHook().status, 0);
  });
});

test('the hook rejects a staged .mjs file that ESLint would reject', async () => {
  await withHookRepo(async (repo) => {
    await repo.write('unused.mjs', UNUSED_VARIABLE_MJS);
    repo.stage('unused.mjs');
    assert.notEqual(repo.runHook().status, 0);
  });
});

test('the hook accepts a staged file that passes both checks', async () => {
  await withHookRepo(async (repo) => {
    await repo.write('good.mjs', FORMATTED_MJS);
    repo.stage('good.mjs');
    assert.equal(repo.runHook().status, 0);
  });
});

test('the hook ignores an unformatted file that is not staged', async () => {
  await withHookRepo(async (repo) => {
    await repo.write('good.mjs', FORMATTED_MJS);
    await repo.write('untouched.mjs', UNFORMATTED_MJS);
    await repo.write('data.json', UNFORMATTED_JSON);
    repo.stage('good.mjs');
    assert.equal(repo.runHook().status, 0);
  });
});

test('the hook leaves staged files that the tools ignore or do not know alone', async () => {
  await withHookRepo(async (repo) => {
    await mkdir(path.join(repo.root, 'docs-site'));
    await repo.write(path.join('docs-site', 'page.mjs'), UNFORMATTED_MJS);
    await repo.write('blob.dat', 'not   a source file');
    repo.stage(path.join('docs-site', 'page.mjs'), 'blob.dat');
    const { status, output } = repo.runHook();
    assert.equal(status, 0, output);
  });
});

test('lint-staged has one pattern and no tool flags of its own', async () => {
  const pkg = JSON.parse(
    await readFile(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as {
    scripts: Record<string, string>;
    'lint-staged': Record<string, string[]>;
  };
  const patterns = Object.keys(pkg['lint-staged']);
  assert.deepEqual(patterns, ['*']);
  for (const command of pkg['lint-staged']['*']) {
    assert.match(command, /^pnpm lint:[a-z]+$/);
    assert.ok(pkg.scripts[command.replace('pnpm ', '')]);
  }
});

# CI and runners

## GitHub-hosted (current default)

`procyon-creative/qa-instructions` is **public**, so Linux hosted runners are free. CI and E2E use `ubuntu-latest` today.

| Workflow                         | Runner          | When                      |
| -------------------------------- | --------------- | ------------------------- |
| `ci.yml`                         | `ubuntu-latest` | Every PR + push to `main` |
| `e2e.yml`                        | `ubuntu-latest` | Every PR + push to `main` |
| `jira.yml`, `release-please.yml` | `ubuntu-latest` | Events as configured      |

## Required checks

The `protect` ruleset on `main` requires two status checks. A PR cannot merge until both pass.

| Check                 | Job                          |
| --------------------- | ---------------------------- |
| `lint + test + build` | `ci.yml` → `lint-test-build` |
| `e2e goldens`         | `e2e.yml` → `e2e`            |

Neither workflow uses `paths-ignore` on `pull_request`. A required check that never reports leaves the PR blocked, so docs-only PRs must run both. Renaming a job's `name:` breaks its required check; update the ruleset in the same change.

## Releases

A release happens when `version` in `packages/qa-instructions/package.json` changes on `main` to a version that has no `vX.Y.Z` tag yet. To cut one, bump `version` in a PR and merge it.

`release-please.yml` runs on pushes to `main` that touch that `package.json` (upstream only; forks skip it). It reads `version` and checks for the `v<version>` tag. If the tag exists, the run does nothing, so dependency-only edits and re-runs are no-ops. Otherwise it builds and publishes `@procyon-creative/qa-instructions` to npm with OIDC trusted publishing (no npm token), tags `vX.Y.Z` and creates the GitHub release with generated notes, and posts the release to Jira. It publishes before tagging, so a failed publish leaves no tag and re-running the job retries it. Pushes that don't touch the file never start the workflow.

Release notes after 3.0.0 live on [GitHub Releases](https://github.com/procyon-creative/qa-instructions/releases); `packages/qa-instructions/CHANGELOG.md` covers 3.0.0 and earlier.

The workflow keeps its `release-please.yml` filename although release-please is gone: npm trusted publishing is bound to it. Renaming the file breaks publishing until a maintainer re-runs `npm trust` below with the new name.

### One-time npm setup (maintainer)

Trusted publishing needs the package to exist on npm first. Do this before the first automated release:

```bash
npm login
pnpm install && pnpm build
cd packages/qa-instructions && npm publish --access public
npm trust github @procyon-creative/qa-instructions --file release-please.yml --repo procyon-creative/qa-instructions
```

`npm trust` prompts for 2FA. After that, every version bump merged to `main` publishes on its own.

## Self-hosted on `ruby`

Use the homelab runner on **`ruby`** when hosted Actions are not enough:

- Private repos under `procyon-creative` (hosted minutes bill the org)
- Jobs that need heavy Playwright/browser caches, Docker, or long runtimes
- Anything blocked on the org's free hosted quota

**Do not** attach a repo-scoped self-hosted runner to a **public** repo unless jobs are restricted to trusted refs only (e.g. push to `main` from upstream, not fork PRs). Fork PRs can execute workflow code on the host.

### Pattern (from `resume-builder`)

```yaml
jobs:
  e2e:
    runs-on: [self-hosted, linux]
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      # …
```

### Provision a runner

Private repo only. See `add-self-hosted-runner` skill:

- Host: `ruby`
- Container: `gh-runner-<owner>-<repo>`
- Labels: `self-hosted,linux`
- Env: `/etc/gh-runner/<owner>-<repo>.env`

Registration (one-time):

```bash
gh api -X POST repos/<owner>/<repo>/actions/runners/registration-token --jq .token
# → set RUNNER_TOKEN in env file, start container on ruby
```

### Switching this repo to `ruby`

When needed (e.g. repo goes private or org minute limits bite):

1. Provision runner on `ruby` for the target repo (private).
2. Change `runs-on` in `.github/workflows/e2e.yml` (and optionally `ci.yml`) to `[self-hosted, linux]`.
3. For public repos, gate self-hosted jobs:

   ```yaml
   if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
   ```

   so fork PRs stay on `ubuntu-latest`.

## Local verification

Before push (saves hosted/self-hosted cycles):

```bash
pnpm verify   # examples/verification: test → render → golden probes
```

The examples serve the fixture site on port 4321. Set `FIXTURE_PORT` (e.g. `FIXTURE_PORT=4400 pnpm verify`) to run on another port, such as a second worktree's run alongside the first; goldens still compare against 4321.

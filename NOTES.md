# NOTES

## This repo

- **qa-instructions** — npm monorepo, Playwright-first, collect → render architecture

## Issue tracker

- Jira **QI** — https://procyoncreative.atlassian.net/jira/software/c/projects/QI/boards
- GitHub: https://github.com/procyon-creative/qa-instructions (canonical), fork on `nicolasgalvez` for day-to-day work

## CI / runners

- **Public repo** → GitHub-hosted `ubuntu-latest` is free; CI + E2E use that today.
- **Ruby homelab** → use self-hosted `[self-hosted, linux]` on host `ruby` when procyon-creative hosted quota isn't enough (private repos, heavy Playwright, long jobs). See `docs/ci.md` and `add-self-hosted-runner` skill. Never bind a public repo runner to fork PRs without gating.
- QA steps destination: Jira/ticket fields (plain text, not markdown)

## Tools in play

- **Superpowers:** brainstorming, writing-plans, subagent-driven-development, using-superpowers
- **Matt skills (ask-matt router):** grill-me, research, grill-with-docs, to-spec, to-tickets, implement, tdd, code-review
- **loop-me:** workflows/*.md specs for recurring loops

## Terminology

- **Collect** — test adapter writes `QaRunBundle` (JSON + assets); no rendering
- **Render** — CLI or pure functions transform bundle → qa-steps.txt / json / markdown
- **Plan** — `docs/superpowers/plans/*.md`; task list for SDD
- **Research** — cited primary-source doc in `docs/research/`; runs before build decision
- **Done** — plan tasks complete + tests pass + success criteria checked; not "keep improving"

## What went wrong in this project

Ran skill fragments out of order: code before plan, research after build, SDD abandoned mid-flight, loop-me never wrote workflow spec until now.

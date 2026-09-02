# NOTES

## This repo

- **qa-instructions** — npm monorepo, Playwright-first, collect → render architecture
- Issue tracker: none yet (local git only)
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

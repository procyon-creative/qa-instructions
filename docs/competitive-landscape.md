# Competitive Landscape

> **Canonical research:** [research/2026-03-27-competitive-and-api-research.md](./research/2026-03-27-competitive-and-api-research.md) — primary-source citations, npm search, docs-tests deep comparison. This file is a summary only.

## What we're building

Tests → canonical bundle → separate render → **plain-text ticket QA steps** (numbered list, action + expected on same line, one prerequisite line). Not product docs, not dev HTML reports, not AI-generated prose.

## Summary verdict

**No product does all of this.** Several cover 60–80% with different output contracts or coupled capture/render. The narrowest unserved gap is ticket-format QA steps with explicit collect/render separation.

**Closest architectural peer:** [docs-tests](https://github.com/heddendorp/docs-tests) — same attach + reporter pattern, different output (product documentation prose, Markdown rendered in reporter pass).

**Upstream option:** Contribute a `qa-steps` renderer to docs-tests before expanding qa-instructions scope.

## Matrix

| Product | Direction | Screenshots | Human output | Collect/render split | Ticket QA steps | Runner-agnostic |
|---------|-----------|-------------|--------------|---------------------|-----------------|-----------------|
| **qa-instructions** | tests → steps | ✓ per step | Plain numbered list | ✓ explicit | ✓ | ✓ (design; PW only v0.1) |
| [docs-tests](https://github.com/heddendorp/docs-tests) | tests → docs | ✓ | Product docs Markdown | Partial (reporter renders) | ✗ | ✗ Playwright only |
| [playwright-checkpoint](https://github.com/pm990320/playwright-checkpoint) | tests → help articles | ✓ | Help-center Markdown | Partial | ✗ | ✗ |
| [playwright-scenario-recorder](https://github.com/FR-k-sakamoto/playwright-scenario-recorder) | tests → manuals | ✓ annotated | Markdown manuals | ✗ coupled | ✗ | ✗ |
| [Serenity/JS](https://serenity-js.org) | tests → living docs | ✓ auto | HTML for devs/stakeholders | ✗ | ✗ | ✗ (PW, WDIO, etc.) |
| [browser-agent-recorder](https://github.com/VelvetAbyss/browser-agent-recorder) | record → SOP | ✓ highlighted | Markdown SOP | N/A (extension) | Partial | ✗ |
| [playwright-custom-report](https://github.com/github-rhobin/playwright-custom-report) | tests → HTML report | ✓ inline steps | Dev HTML report | ✗ | ✗ | ✗ |
| [monocart-reporter](https://www.npmjs.com/package/monocart-reporter) | tests → dev report | ✓ | Tree grid + annotations | ✗ | ✗ | ✗ |
| [flowreplay](https://github.com/kuilenren/flowreplay) | demo → flow file | ✗ | Markdown + replay | ✗ | ✗ | Partial |
| Playwright test agents | plan → tests | via trace | Markdown plans | ✗ | ✗ | ✗ |

## Opposite direction (manual → tests, not our problem)

| Product | What it does |
|---------|-------------|
| [playwright-manual-to-test-generator](https://github.com/rmgoede/playwright-manual-to-test-generator) | Paste manual steps → Playwright spec |
| [Quorvex AI](https://github.com/Simon99/quorvex_ai) | Natural language spec → self-healing tests |
| [qa-core-agent](https://github.com/sardar-usman/qa-core-agent) | User story / URL → Playwright suite |
| mk:qa-manual / MeowKit | Spec → manual QA report OR generate `.spec.ts` |
| Playwright codegen / VS Code extension | Record interactions → test script |

## AI / MCP workflows (adjacent, not deterministic)

| Product | What it does |
|---------|-------------|
| [playwright-mcp](https://github.com/microsoft/playwright-mcp) | MCP browser tools for agents |
| AI-QA-Automation-Agent (Playwright + JIRA MCP) | Generate cases, run tests, JIRA bugs |
| E2E Agentic AI QA Workflow | Requirements → plans → tests → heal |

These produce reports or tests via LLM reasoning — not a stable, deterministic bundle format renderable to multiple sinks.

## docs-tests comparison (detailed)

Both use Playwright attachments + custom reporter. Key differences:

| Aspect | docs-tests | qa-instructions |
|--------|-----------|-----------------|
| Attachment names | `docs-tests:guide`, `docs-tests:markdown`, `docs-tests:image:*` | `qa-run-bundle`, step-scoped `qa-screenshot` |
| Bundle | `docs-tests.bundle.json` (alpha v1alpha1) | `bundle.json` (v1) |
| Render timing | In reporter pass (Markdown pages) | Separate CLI step |
| Output shape | Portable Markdown pages + images | Plain text qa-steps for Jira |
| Grouping | By guide metadata / describe block | One bundle per test |
| Prose model | Narrative product documentation | Terse action + expected per step |
| Redaction / permissions | Built-in | Out of scope v0.1 |

**Overlap:** ~70% on capture pattern. **Differentiation:** output contract + collect/render separation.

## When to keep building qa-instructions

- Ticket QA steps format validated with real testers (paste into Jira, someone runs them without reading test source)
- Same bundle needs multiple render sinks (qa-steps + markdown + future)
- Runner-agnostic core matters (Jest, DevTools import later)

## When to contribute upstream instead

- docs-tests accepts a qa-steps renderer mode
- Product docs and ticket steps can share the same capture layer
- Scope stays Playwright-only indefinitely

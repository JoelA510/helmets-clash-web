# Development log

Current as of 2026-04-27.

Use this file as an append-only log. Newest entries may go at the top.

## Entry template

```md
## YYYY-MM-DD - Short title

### Summary

- ...

### Files changed

- `path/to/file`

### Commands run

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Pass/Fail/Not run | ... |
| `npm run test` | Pass/Fail/Not run | ... |
| `npm run build` | Pass/Fail/Not run | ... |
| `npm run test:e2e` | Pass/Fail/Not run | ... |

### Decisions

- ...

### Follow-ups

- ...
```

## 2026-04-27 - Documentation control directory initialized

### Summary

- Created baseline `dev-documentation/` structure for Codex-assisted development.
- Added spec, roadmap, implementation plan, test plan, playtest findings, and ADRs.
- Added Codex task prompts under `dev-documentation/codex-prompts/`.
- No application code changes are included in this documentation package.

### Files changed

- `dev-documentation/README.md`
- `dev-documentation/CODEX_HANDOFF.md`
- `dev-documentation/spec.md`
- `dev-documentation/roadmap.md`
- `dev-documentation/implementation-plan.md`
- `dev-documentation/test-plan.md`
- `dev-documentation/playtest-findings.md`
- `dev-documentation/development-log.md`
- `dev-documentation/decisions/ADR-0001-seat-faction-decoupling.md`
- `dev-documentation/decisions/ADR-0002-occupied-city-selection.md`
- `dev-documentation/codex-prompts/*.md`

### Commands run

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Not run | Documentation package generated outside the repo workspace. |
| `npm run test` | Not run | Documentation package generated outside the repo workspace. |
| `npm run build` | Not run | Documentation package generated outside the repo workspace. |
| `npm run test:e2e` | Not run | Documentation package generated outside the repo workspace. |

### Decisions

- `spec.md` is the durable behavior contract.
- Prompt files are task packets, not the source of truth after their requirements are consolidated.
- Duplicate faction selection remains disabled by default until runtime faction identity is separated from faction preset identity.

### Follow-ups

- Import this directory into the repo.
- Run the baseline audit prompt before code changes.
- Update this log after each Codex implementation pass.

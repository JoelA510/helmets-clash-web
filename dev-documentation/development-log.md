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

## 2026-04-27 - Occupied-city fix documentation sync and validation capture

### Summary

- Recorded post-fix documentation updates for occupied-city interaction behavior and regression planning.
- Captured root-duplicate cleanup actions: canonical prompt docs remain under `dev-documentation/codex-prompts/`; root-level duplicate prompt markdown files were identified as legacy copies and should no longer be edited as source of truth.
- Updated planning docs to reflect implemented occupied-city behavior expectations, risks, and test strategy.

### Gameplay fix summary

- Occupied-city interaction is documented as requiring a reliable city-management path even when a friendly unit occupies the same tile.
- Regression coverage is now explicitly scoped to preserve combat/targeting behavior while ensuring city access remains available.

### Files changed

- `dev-documentation/development-log.md`
- `dev-documentation/implementation-plan.md`
- `dev-documentation/test-plan.md`
- `dev-documentation/roadmap.md`
- `dev-documentation/spec.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`RUN  v4.1.5 /workspace/helmets-clash-web`<br>`Test Files  12 passed (12)`<br>`Tests  151 passed (151)`<br>`Duration  23.05s` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`vite v8.0.9 building client environment for production...`<br>`✓ 1751 modules transformed.`<br>`✓ built in 2.71s` |
| `npm run test:e2e` | Not run | Not required for this docs synchronization pass; no gameplay code changes were applied in this commit. |

### Decisions

- Keep `dev-documentation/` as the authoritative location for implementation prompts/plans.
- Treat root-level prompt duplicates as technical debt cleanup scope; avoid editing both locations to prevent drift.
- Keep occupied-city behavior wording in spec/test docs explicit enough to prevent selection-priority regressions.

### Follow-ups

- Remove or archive root-level duplicate prompt markdown files after confirming no tooling depends on those paths.
- Add/verify explicit occupied-city regression tests in CI if any scenario is still only manually validated.
- Run optional Playwright coverage for occupied-city keyboard flow (`npm run test:e2e`) when E2E time budget is available.

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

# Development log

Current as of 2026-04-27.

Use this file as an append-only log. Newest entries may go at the top.

## 2026-04-27 - Pass 1+2: root prompt cleanup and occupied-city selection fix

### Summary

- Removed root-level duplicate prompt-packet markdown copies after confirming each file matched its `dev-documentation/codex-prompts/` counterpart.
- Audited current occupied-city selection flow and documented implementation/test risks in `implementation-plan.md`.
- Implemented first bounded gameplay/UX fix: friendly city access is now preserved when a friendly unit occupies the same hex.
- Added an explicit side-panel action to open the selected occupied friendly city (`Open city: <name>`), including keyboard-accessible flow.
- Updated city modal plumbing to open the exact selected city id rather than always resolving from `viewerCity`.
- Added component regression tests covering city-only, unit-only, and occupied city interactions.

### Files changed

- `src/ui/GameScreen.tsx`
- `src/ui/InfoPanel.tsx`
- `src/__tests__/components/GameScreen.occupied-city.test.tsx`
- `dev-documentation/implementation-plan.md`
- `dev-documentation/test-plan.md`
- `dev-documentation/roadmap.md`
- `dev-documentation/spec.md`
- `dev-documentation/development-log.md`
- deleted root duplicate prompt files:
  - `00_README_PROMPT_INDEX.md`
  - `01_baseline_repo_audit_and_test_map.md`
  - `02_fix_occupied_city_selection.md`
  - `03_decouple_seat_from_faction_choice_domain.md`
  - `04_build_setup_faction_selection_ui.md`
  - `05_add_setup_and_city_interaction_tests.md`
  - `06_improve_in_game_selection_affordances.md`
  - `07_optional_light_faction_gameplay_bonuses.md`
  - `08_docs_playtest_checklist_and_release_notes.md`
  - `09_post_change_review_prompt.md`

### Commands run

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Fail | `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@eslint/js' imported from /workspace/helmets-clash-web/eslint.config.js` |
| `npm install` | Fail | Command never completed with success output; later checks still showed invalid/missing dev dependencies. |
| `npm run lint` | Fail | `Cannot find package '/workspace/helmets-clash-web/node_modules/@eslint/js/index.js' imported from /workspace/helmets-clash-web/eslint.config.js` |
| `npm run test` | Fail | `sh: 1: vitest: not found` |
| `npm run build` | Fail | `TS2688: Cannot find type definition file for 'vite/client'` and `TS2688: Cannot find type definition file for 'node'` |
| `npm ls vitest @eslint/js --depth=0` | Fail | Both packages reported as `invalid` in `node_modules`. |
| `npm ci` | Fail | Command did not produce completion output and dependencies remained unusable in this environment. |
| `npm run test:e2e` | Not run | Skipped because baseline install/validation failed before Playwright checks. |

### Decisions

- Keep the occupied-city fix scoped to selection affordance + city modal targeting, avoiding broader in-game selection refactors.
- Use an explicit side-panel city action when a selected friendly unit occupies a friendly city tile to preserve clarity and keyboard reachability.

### Follow-ups

- Fix environment package-install reliability (npm/proxy or registry issue) and rerun `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`.
- In the next pass, proceed to seat/faction decoupling only after baseline validation commands are green.

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

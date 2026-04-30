## 2026-04-30 - Persist migration active-seat hardening guard

### Summary

- Added a migration guard in `migrateLoadedGameState` to reject saves whose migrated active seats are fewer than two.
- Added regression tests for malformed seat payloads that would previously migrate to 0 or 1 active seat.

### Validation

- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npm run test:e2e` not run (Playwright browser availability not verified in this run).

## 2026-04-30 - Autosave resume migration hardening for Prompt 03/04 faction presets

### Summary

- Added `migrateLoadedGameState(parsed)` in `src/game/persist.ts` and routed `loadGame()` through it so resume now tolerates legacy save shapes missing `seat.factionPresetId` and/or `faction.factionPresetId`.
- Preserved current valid save payload behavior while adding deterministic legacy fallback mapping by active-seat order, runtime faction id fallback mapping, and a final safe `aldermere` fallback only when needed.
- Kept set rehydration behavior for `factions[*].buildings` and `factions[*].explored`, and return `null` for malformed payloads that cannot be migrated safely.
- Added focused persistence migration tests for current saves, legacy seat/faction preset omissions, valid preset alignment, and malformed save handling.

### Files changed

- `src/game/persist.ts`
- `src/__tests__/persist.test.ts`
- `dev-documentation/development-log.md`

### Follow-ups

- Continue monitoring localStorage payload versioning; future schema additions should extend `migrateLoadedGameState` rather than direct-casting parsed JSON into `GameState`.
- Migration currently validates seat entries are objects and ignores unknown faction keys; future schema changes should preserve those invariants.

### PR #25 Gemini review follow-up

- Added nested array-object validation for required state collections: `cities`, `units`, and `log` now must be arrays of objects or migration returns `null`.
- Hardened active-seat normalization by repairing missing/invalid `idx` and runtime `factionId` deterministically, then capping migrated active seats to the supported runtime faction count.
- Added required migrated-seat faction-presence checks so each migrated seat must map to a corresponding migrated runtime faction entry.
- Normalized `config.seats` handling across shape variants: present+valid seats are migrated, missing seats are reconstructed from migrated active seats, and malformed seats cause migration rejection.
- Validation refresh for this PR #25 pass: `npm run lint` pass, `npm run test` pass, `npm run build` pass.
- `npm run test:e2e` note: include only when Playwright browsers are installed in the environment (`npx playwright install`); otherwise omitted from pass/fail validation.

## 2026-04-29 - Review follow-up: preset resolution consistency in setSeatFactionPreset

### Summary

- Refactored `setSeatFactionPreset(...)` in `NewGameScreen` to use `selectedPresetForSeat(seat, idx)` when resolving the previous preset for AI default-name transitions.
- This removes manual fallback indexing (`FACTION_PRESETS[idx]`) and aligns all seat preset resolution with the modulo-safe helper.
- Kept setup behavior unchanged (AI rename rule, duplicate-faction validation, start gating, seat faction radio controls, and resume/discard flows).

### Files changed

- `src/ui/NewGameScreen.tsx`
- `dev-documentation/development-log.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`Test Files  15 passed (15)`<br>`Tests  162 passed (162)` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`✓ built in 2.88s` |
| `npm run test:e2e` | Fail (env) | `Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell`<br>`Please run: npx playwright install` |

### Decisions

- Kept this pass narrowly scoped to the reviewer-noted consistency/safety refactor.

### Follow-ups

- Prompt 04 can continue; this change is internal resolver hygiene only.


## 2026-04-29 - NewGameScreen unused helper cleanup (resolvePreset)

### Summary

- Removed unused `resolvePreset(...)` helper from `src/ui/NewGameScreen.tsx` to resolve ESLint/Vercel `no-unused-vars` warning.
- Kept `selectedPresetForSeat(...)` as the active seat preset resolver used by `cycleSeat` and seat rendering.
- Left seat kind cycling, per-seat faction radios, duplicate-faction validation, Begin Campaign disablement, and resume/discard save behavior unchanged.

### Files changed

- `src/ui/NewGameScreen.tsx`
- `dev-documentation/development-log.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`Test Files  15 passed (15)`<br>`Tests  162 passed (162)` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`✓ built in 2.97s` |
| `npm run test:e2e` | Fail (env) | `Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell`<br>`Please run: npx playwright install` |

### Decisions

- Scoped this pass strictly to unused-helper cleanup; no gameplay or setup behavior changes.
- Updated only `development-log.md` per docs scope rules for cleanup-only changes.

### Follow-ups

- Prompt 04 can continue; no additional blockers introduced by this cleanup.


## 2026-04-29 - NewGameScreen Prompt 04 test pass refresh

### Summary

- Reworked `src/__tests__/components/NewGameScreen.test.tsx` to match the current radio-card faction setup UI and decoupled per-seat faction behavior.
- Added/updated coverage for Prompt 04 scenarios: faction option visibility, seat faction changes, `factionPresetId` submit passthrough, help text linkage, duplicate-faction blocking, empty-seat duplicate handling, faction release on seat emptying, AI default-name safety, and combined min-seat + duplicate validation.
- No production code changes were required.

### Files changed

- `src/__tests__/components/NewGameScreen.test.tsx`
- `dev-documentation/development-log.md`

### Commands run

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Passed | No lint errors reported. |
| `npm run test` | Passed | 15 test files passed, 169 tests passed. |
| `npm run build` | Passed | Vite production build completed successfully. |
| `npm run test:e2e` | Warning | Failed due to missing Playwright browser executable (`npx playwright install` needed), not treated as product regression. |

### Decisions

- Kept test assertions accessibility-first (`getByRole`, `getByLabelText`, text content), avoiding brittle style/class matching except where disabled card affordance is part of expected behavior.
- Preserved existing minimum-seat and resume-banner coverage while removing stale index-locked assumptions from faction-selection behavior checks.

### Follow-ups

- Once Playwright browsers are installed in CI/local, re-run `npm run test:e2e` to restore runtime UI flow confidence.

## 2026-04-28 - Prompt 03 review follow-up fixes (pattern id regression + activeSeats safety)

### Summary

- Addressed review feedback by simplifying `activeSeats(config)` fallback indexing to use `runtimeIdx` directly and adding a defensive fallback for runtime faction id lookup (`RUNTIME_FACTION_IDS[runtimeIdx] ?? RUNTIME_FACTION_IDS[0]`).
- Fixed city fill pattern regression introduced by semantic preset ids: city SVG fills now reference `faction.factionPresetId` instead of runtime `faction.id`.
- Updated pattern usage comment and added a malformed-config guard test covering `activeSeats` behavior when more than 4 active seats are provided.

### Files changed

- `src/game/state.ts`
- `src/ui/HexBoard.tsx`
- `src/ui/FactionPatterns.tsx`
- `src/__tests__/state.seatFaction.test.ts`
- `dev-documentation/development-log.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`Test Files  15 passed (15)`<br>`Tests  162 passed (162)` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`✓ built in 2.98s` |

### Decisions

- Kept this follow-up narrowly scoped to the two code review concerns only.
- Did not change Prompt 03 feature scope or Prompt 04 UI scope.

### Follow-ups

- Optional: add a setup-time validation guard to reject >4 non-empty seats before calling `initialState` for stricter runtime invariants.

## 2026-04-28 - Prompt 03 model/domain decoupling for seat faction presets

### Summary

- Implemented Prompt 03 at the domain/model layer by splitting runtime `FactionId` (`f1`-`f4`) from semantic `FactionPresetId` (`aldermere`/`grimhold`/`sunspire`/`moonwatch`).
- Extended `FactionPreset`, `SeatConfig`, `Seat`, and `FactionState` to carry explicit preset identity/metadata.
- Reworked `activeSeats(config)` to preserve chosen `factionPresetId` per active seat while assigning runtime faction ids independently.
- Added deterministic legacy fallback for old seat configs that omit `factionPresetId`: fallback maps by legacy active-seat order (`FACTION_PRESETS[0]`, then `[1]`, etc.), matching pre-change behavior.
- Updated state initialization so selected preset metadata drives city/faction visuals, unit pool, and starter unit composition.
- Added regression tests for decoupled seat/preset mapping, empty-seat stability, runtime deck uid namespace, and old-config compatibility.

### Files changed

- `src/game/types.ts`
- `src/game/constants.ts`
- `src/game/state.ts`
- `src/ui/NewGameScreen.tsx`
- `src/__tests__/helpers.ts`
- `src/__tests__/state.seatFaction.test.ts`
- `dev-documentation/development-log.md`
- `dev-documentation/implementation-plan.md`
- `dev-documentation/roadmap.md`
- `dev-documentation/test-plan.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`Test Files  15 passed (15)`<br>`Tests  161 passed (161)` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`✓ built in 5.16s` |
| `npm run test:e2e` | Fail | `Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell`<br>`Please run: npx playwright install` |

### Decisions

- Kept Prompt 03 strictly at model/domain scope; did not implement full faction-selection UI (Prompt 04).
- Retained runtime starter deck uid namespace on `FactionId` to avoid collisions if duplicate presets are ever enabled.
- Applied a backward-compatible fallback for old seat config shapes instead of introducing a hard save-version migration in this pass.

### Follow-ups

- Prompt 04 can now add per-seat preset selectors in setup UI using `SeatConfig.factionPresetId` as the source of truth.
- Install Playwright browsers in CI/dev (`npx playwright install`) before relying on `npm run test:e2e` results.

# Development log

Current as of 2026-04-27.

Use this file as an append-only log. Newest entries may go at the top.

## 2026-04-28 - Occupied-city regression repair in GameScreen activation flow

### Summary

- Repaired a stale occupied-city modal state call in `handleHexActivate` that still referenced removed `setCityModalOpen(true)`.
- Updated the occupied friendly unit + friendly city activation branch to use the current city modal state flow with `setOpenCityId(cityAt.id)`.
- Kept targeting, movement, attack dispatches, pass-device handling, and autosave-related flow unchanged.

### Files changed

- `src/ui/GameScreen.tsx`
- `dev-documentation/development-log.md`

### Commands run

| Command | Result | Exact output |
|---|---|---|
| `npm run lint` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 lint`<br>`> eslint .` |
| `npm run test` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 test`<br>`> vitest run`<br>`RUN  v4.1.5 /workspace/helmets-clash-web`<br>`Test Files  14 passed (14)`<br>`Tests  157 passed (157)`<br>`Duration  33.85s` |
| `npm run build` | Pass | `npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.`<br>`> helmets-clash-web@1.0.0 build`<br>`> tsc -b && vite build`<br>`vite v8.0.9 building client environment for production...`<br>`✓ 1751 modules transformed.`<br>`✓ built in 2.87s` |
| `npm run test:e2e` | Fail | `Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell`<br>`Looks like Playwright was just installed or updated.`<br>`Please run: npx playwright install`<br>`2 failed` |

### Decisions

- Kept this pass strictly scoped to the occupied-city regression branch in `handleHexActivate`; no seat/faction domain work was introduced.
- Did not update implementation-plan/roadmap/test-plan because durable plan/status and coverage goals are unchanged by this one-line behavioral repair.

### Follow-ups

- Install Playwright browsers (`npx playwright install`) and re-run `npm run test:e2e` to restore e2e signal in this environment.

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

## 2026-04-27 - Removed duplicate root prompt packets

### Summary

- Deleted root-level prompt packet Markdown files that were confirmed duplicates of `dev-documentation/codex-prompts/*.md`.
- Kept `README.md` and all files under `dev-documentation/` intact.

### Deleted duplicate files

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

### Verification method

- Verified each root-level file against `dev-documentation/codex-prompts/<same filename>` immediately before deletion using `cmp -s` (byte-for-byte parity check).


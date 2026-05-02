# Hardening Plan (Pre-Feature Work)

## Final recommendation
**Completed 2026-05-02:** App resume/discard/replay coverage was validated on `main`; PR2-PR5 were implemented and merged in order; PR6 remains optional/deferred.

---

## 1) Repo verification summary

### Files inspected
- Tooling/config: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `eslint.config.js`, `vite.config.ts`, `playwright.config.ts`
- App/game flow: `src/App.tsx`, `src/game/persist.ts`, `src/game/state.ts`, `src/game/reducer.ts`, `src/game/turn.ts`, `src/game/logic.ts`, `src/game/ai.ts`, `src/game/types.ts`
- UI: `src/ui/NewGameScreen.tsx`, `src/ui/GameScreen.tsx`, `src/ui/EndScreen.tsx`, `src/ui/SettingsModal.tsx`, `src/ui/HexBoard.tsx`, `src/ui/InfoPanel.tsx`
- Preferences: `src/hooks/useUIPrefs.ts`
- Tests: `src/__tests__/**`, `tests/e2e/**`
- Docs: `README.md`, `dev-documentation/roadmap.md`, `dev-documentation/test-plan.md`, `dev-documentation/spec.md`, `dev-documentation/development-log.md`, `dev-documentation/implementation-plan.md`, `dev-documentation/decisions/**`

### Findings confirmed vs resolved
- **Finding A (App auto-enters gameplay on save): Resolved and App-tested**
- **Finding B (Replay after resumed game fails): Resolved and App-tested**
- **Finding C (`activeSeatIdx` migration semantics): Resolved**
- **Finding D (missing/weak App-level integration tests): Resolved by existing App seam coverage**
- **Finding E (AI pacing setting appears no-op): Resolved by hiding the visible control**
- **Finding F (enemy unit+city same-tile targeting implicit/under-tested): Resolved with unit-before-city tests**
- **Finding G (documentation drift): Resolved in docs sync**

### New risks found
- App mode transition edge cases are now covered at the App seam.
- Persist migration now asserts migrated `activeSeatIdx` is a runtime `Seat.idx`.
- AI pacing remains intentionally hidden until runtime pacing exists.

---

## 2) Executed PR breakdown

The breakdown below is preserved as the sequence that was executed. PR1 was validation-only because the App seam tests already existed; PR2-PR5 were implemented and merged; PR6 remains deferred.

## PR 1 — Verify/refine App resume/discard/replay integration + add App seam tests (validated)
- **Goal:** Close Finding D and verify Findings A/B remain correct on main.
- **Why now:** Highest-value integration seam gap even when flow fixes are already present.
- **Files to inspect:** `src/App.tsx`, `src/ui/NewGameScreen.tsx`, `src/ui/GameScreen.tsx`, `src/ui/EndScreen.tsx`, `src/game/persist.ts`, test helpers.
- **Files likely to change:** new `src/__tests__/components/App.test.tsx` (or equivalent), with `src/App.tsx` only if edge-case defects are found.
- **Implementation approach:**
  - Verify and refine explicit app mode transitions and state persistence.
  - Keep persisted save snapshot handling under App-level integration coverage.
  - Confirm startup with valid save renders setup/menu with Resume/Discard controls.
  - Confirm replay sources config from active new-game config or resumed state config.
- **Acceptance criteria:**
  - Save present startup -> setup/menu renders Resume/Discard and does not auto-enter gameplay.
  - Resume enters GameScreen with loaded GameState.
  - Discard clears save and stays on setup/menu.
  - Replay after resumed game starts fresh game with same setup config.
  - Malformed save safely falls back to setup/menu.
- **Required tests:** App integration tests for all above.
- **Validation commands:** `npm run lint`, `npm run test`, `npm run build`, targeted App test command.
- **Risks:** Mode transition bugs; localStorage test isolation errors.
- **Rollback strategy:** Revert PR commit.
- **Dependencies:** none.

## PR 2 — Fix persistence migration `activeSeatIdx` semantics (completed)
- **Goal:** Resolve Finding C with deterministic, contract-consistent migration.
- **Why now:** Persistence correctness and resumed-turn ownership risk.
- **Files to inspect:** `src/game/persist.ts`, `src/game/state.ts`, `src/game/reducer.ts`, `src/game/turn.ts`, `src/__tests__/persist.test.ts`.
- **Files likely to change:** `src/game/persist.ts`, `src/__tests__/persist.test.ts`.
- **Implementation approach:**
  - Confirm semantic contract: runtime `activeSeatIdx` equals `seat.idx`.
  - Ensure migration maps active seat to migrated seat `idx` (not active-rank).
  - Add deterministic fallback when parsed active seat is invalid/removed.
- **Acceptance criteria:**
  - Migrated `activeSeatIdx` is always one of `state.seats[*].idx`.
  - Non-contiguous seats resume with correct active player.
  - Invalid source active seat falls back deterministically.
- **Required tests:** New/updated persist regression tests for non-contiguous seats and invalid active-seat fallback.
- **Validation commands:** targeted persist tests + full lint/test/build.
- **Risks:** Existing tests that codify old semantics need updates.
- **Rollback strategy:** Revert PR commit.
- **Dependencies:** none.

## PR 3 — Resolve AI pacing honesty (completed)
- **Goal:** Resolve Finding E without introducing turn-loop race risk.
- **Why now:** Visible no-op control erodes trust.
- **Files to inspect:** `src/ui/SettingsModal.tsx`, `src/hooks/useUIPrefs.ts`, related tests/snapshots/docs.
- **Files likely to change:** `src/ui/SettingsModal.tsx`, test files/snapshots, docs.
- **Implementation approach:**
  - Preferred: hide/remove AI pacing controls until runtime wiring exists.
  - Preserve backward compatibility for stored prefs.
- **Acceptance criteria:** No visible AI pacing control that does nothing.
- **Required tests:** Settings modal tests/snapshots updated.
- **Validation commands:** targeted settings tests + lint/test/build.
- **Risks:** Snapshot churn.
- **Rollback strategy:** Revert PR commit.
- **Dependencies:** none.

## PR 4 — Pin enemy unit+city same-tile target priority with tests (completed)
- **Goal:** Resolve Finding F by making behavior explicit and test-locked.
- **Why now:** Prevent regressions while preserving current combat semantics.
- **Files to inspect:** `src/game/logic.ts`, `src/ui/GameScreen.tsx`, `src/ui/HexBoard.tsx`, `src/__tests__/components/GameScreen.interactions.test.tsx`, `dev-documentation/test-plan.md`.
- **Files likely to change:** tests first; minimal helper extraction only if needed.
- **Implementation approach:**
  - Encode current intended priority (likely unit-before-city) in tests.
  - Add click + keyboard regression tests for mixed stack.
- **Acceptance criteria:** Mixed-stack target behavior deterministic and covered.
- **Required tests:** GameScreen interaction tests and any necessary logic-level tests.
- **Validation commands:** targeted GameScreen tests + lint/test/build.
- **Risks:** Silent combat behavior drift if refactor too broad.
- **Rollback strategy:** Revert PR commit.
- **Dependencies:** none.

## PR 5 — Documentation sync after code hardening (completed by this PR)
- **Goal:** Resolve Finding G after correctness fixes merge.
- **Why now:** Avoid docs claiming behavior not yet shipped.
- **Files to inspect:** README + `dev-documentation/*` including ADRs.
- **Files likely to change:** `README.md`, `roadmap.md`, `implementation-plan.md`, `test-plan.md`, `spec.md`, `development-log.md`, ADR status files.
- **Implementation approach:**
  - Update stale statuses and milestone text.
  - Mark ADRs as accepted/implemented (or superseded) per actual state.
  - Keep development log newest-first.
- **Acceptance criteria:** Docs reflect actual merged behavior; no stale “not started/proposed” where already implemented.
- **Required tests:** Docs-only consistency check (plus sanity lint/test/build run recommended).
- **Validation commands:** lint/test/build sanity.
- **Risks:** Over-claiming if merged out of order.
- **Rollback strategy:** Revert docs PR.
- **Dependencies:** PRs 1–4 merged.

## PR 6 (optional/deferred) — Performance cleanup
- **Goal:** Small low-risk render/data lookup cleanup only if naturally adjacent to prior work.
- **Why now:** Lowest priority and explicitly deferrable.
- **Dependencies:** After correctness PRs.

---

## 3) Detailed task list

### Task T-APP-01
- **Description:** Verify and refine explicit App mode transitions for save-present startup behavior.
- **Priority:** P1
- **Category:** correctness, UX
- **Expected outcome:** Startup with save stays in setup; Resume/Discard fully functional.
- **Guardrails:** No broad routing rewrite; preserve existing GameScreen behavior.
- **Definition of done:** App integration tests pass for startup resume/discard flows.

### Task T-APP-02
- **Description:** Fix replay-after-resume by deriving replay config from current game source.
- **Priority:** P1
- **Category:** correctness
- **Expected outcome:** End-screen replay starts fresh game with same setup after resumed sessions.
- **Guardrails:** Do not reuse old GameState; avoid seed-contract assumptions in tests.
- **Definition of done:** Replay-after-resume App test passes.

### Task T-TEST-APP-01
- **Description:** Add top-level App integration coverage for save/resume/discard/malformed-save/replay.
- **Priority:** P1
- **Category:** tests
- **Expected outcome:** App seam regressions caught automatically.
- **Guardrails:** Prefer role/text assertions; isolate localStorage per test.
- **Definition of done:** New App test suite stable and meaningful.

### Task T-PERSIST-01
- **Description:** Correct migrated `activeSeatIdx` to `seat.idx` semantics.
- **Priority:** P1
- **Category:** persistence, correctness
- **Expected outcome:** Non-contiguous active seats resume with correct active faction.
- **Guardrails:** Maintain strict payload validation; deterministic fallback required.
- **Definition of done:** Persist tests cover and validate non-contiguous and invalid-active-seat cases.

### Task T-AI-01
- **Description:** Remove/hide non-functional AI pacing control.
- **Priority:** P2
- **Category:** UX, maintainability
- **Expected outcome:** No visible no-op setting in UI.
- **Guardrails:** No async AI rewrite in this pass.
- **Definition of done:** Settings tests/snapshots updated and passing.

### Task T-TARGET-01
- **Description:** Pin enemy unit+city same-tile targeting priority.
- **Priority:** P2
- **Category:** correctness, tests
- **Expected outcome:** Explicit deterministic behavior verified by click + keyboard tests.
- **Guardrails:** No combat rule expansion.
- **Definition of done:** Regression tests added and passing.

### Task T-DOC-01
- **Description:** Sync stale docs/ADR statuses after hardening code merges.
- **Priority:** P3
- **Category:** docs
- **Expected outcome:** Docs match code reality; stale statuses removed.
- **Guardrails:** No aspirational claims.
- **Definition of done:** Updated docs merged after code PRs.

### Task T-PERF-01 (optional)
- **Description:** Opportunistic low-risk performance cleanup.
- **Priority:** P3
- **Category:** performance
- **Expected outcome:** Minor render/data-path simplification if justified.
- **Guardrails:** Do not preempt correctness work.
- **Definition of done:** Separate optional PR with clear evidence/benefit.

---

## 4) Test strategy

### Unit tests
- Persist migration unit tests for `activeSeatIdx` semantics and deterministic fallback.
- Logic-level tests for any extracted/explicit target-priority helper (if introduced).

### Component/integration tests
- New App integration test suite:
  - save present startup behavior,
  - resume transition,
  - discard transition,
  - malformed-save fallback,
  - replay-after-resume.
- GameScreen interaction tests for mixed target stack (click + keyboard).
- SettingsModal tests/snapshots for AI pacing control decision.

### E2E tests
- Optional in local runs unless Playwright browsers are installed.
- If supported, add/extend startup resume/discard and replay-after-resume path.

### Manual QA script
1. Seed localStorage with valid save -> verify setup shows Resume/Discard and does not auto-enter game.
2. Resume -> verify resumed match state appears.
3. Discard -> verify save removed and setup remains active.
4. Inject malformed save -> verify setup remains usable.
5. Finish resumed game -> verify “Play again (same setup)” starts fresh game.
6. Validate enemy unit+city same-tile target behavior via mouse and keyboard.
7. Validate Settings no longer exposes no-op AI pacing control (or is fully functional if implementation path changes).

### Required merge gates by PR
- **PR1:** App integration tests + full lint/test/build.
- **PR2:** Persist regression tests + full lint/test/build.
- **PR3:** Settings tests/snapshots + full lint/test/build.
- **PR4:** GameScreen/targeting tests + full lint/test/build.
- **PR5:** Docs sync + sanity validation commands.
- **PR6:** Optional/deferred.

### Optional/deferred tests
- Playwright E2E where browser installation/CI support is unavailable.
- Performance micro-benchmarking unless PR6 is undertaken.

---

## 5) Validation commands

Minimum commands per implementation PR:

```bash
npm run lint
npm run test
npm run build
```

Targeted commands:

```bash
npm run test -- src/__tests__/persist.test.ts
npm run test -- src/__tests__/components/App.test.tsx
npm run test -- src/__tests__/components/GameScreen.interactions.test.tsx
```

E2E command (only when browsers/CI support it):

```bash
npm run test:e2e
```

Install browsers if explicitly needed in environment setup:

```bash
npm run test:e2e:install
```

---

## 6) Do-not-do list

- No broad app rewrite.
- No save-format redesign unless unavoidable.
- No gameplay feature expansion during hardening sequence.
- No faction asymmetry implementation.
- No large AI rewrite unless intentionally chosen for pacing and separately planned.
- No performance refactor before correctness fixes.
- No docs-only status claims before code fixes are merged.
- No weakening persistence validation.
- No removal of regression tests unless replaced with stronger coverage.

---

## 7) Final recommendation

**Completed:** PR1 was validated, PR2-PR5 were executed in order, and PR6 remains deferred/optional.

Rationale for future work: keep correctness and persistence regressions guarded before starting gameplay expansion.

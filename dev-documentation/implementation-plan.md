# Implementation plan

Current as of 2026-05-02.

Status: UX correctness and hardening pass completed; optional gameplay expansion remains deferred.

## Working state

Goal: keep occupied-city interaction, setup/faction selection, persistence migration, and target priority reliable while preserving existing movement/combat rules.

Constraints:

- Preserve deterministic seeded map generation.
- Preserve existing seat modes: human, AI, empty.
- Preserve autosave/resume compatibility.
- Keep changes small and testable.
- Avoid changing combat resolution rules in occupied-city-focused passes.

## Files inspected for this update

- `src/ui/GameScreen.tsx` (hex activation and city modal opening flow)
- `src/ui/HexBoard.tsx` (board rendering/layering and click surface)
- `src/ui/InfoPanel.tsx` (selection state visibility)
- `src/__tests__/` (existing automated coverage map)
- `src/App.tsx` and `src/game/persist.ts` (resume/replay and save migration hardening)
- Root prompt duplicates: `00_README_PROMPT_INDEX.md` through `09_post_change_review_prompt.md`
- Canonical prompt set: `dev-documentation/codex-prompts/*.md`

## Occupied-city behavior: current vs intended

### Current documented behavior contract

- Friendly city interaction must remain reachable when a friendly unit is on that city tile.
- Selection should remain understandable (unit vs city target) without breaking combat targeting.
- Keyboard users must have an accessible path to city interaction on occupied tiles.
- Enemy unit + city target stacks use unit-before-city attack priority.
- Runtime `activeSeatIdx` remains a `Seat.idx` value across save migration.
- Settings should not expose no-op AI pacing controls.

### Intended durable behavior

- Tile interaction exposes both entities when city + unit coexist.
- City management is reachable without requiring players to move the unit away first.
- Selection priority stays predictable and test-backed, including enemy-target and card-target flows.

## Risks and chosen mitigation

1. **Risk:** Selection-priority edits can regress attack targeting.
   - **Mitigation:** keep attack-target checks explicit and preserve targeting-mode precedence in interaction handlers.
2. **Risk:** UI ambiguity when both city and unit are present.
   - **Mitigation:** document and test a concrete occupied-city affordance (`Open city` path / equivalent explicit route).
3. **Risk:** Drift from duplicate root prompt files.
   - **Mitigation:** treat `dev-documentation/codex-prompts/` as canonical and track root duplicate removal as follow-up.

## Test strategy

Primary validation commands:

- `npm run lint`
- `npm run test`
- `npm run build`

Occupied-city regression strategy:

- Add/maintain focused tests for city access with friendly unit occupation.
- Verify no regression in enemy targeting and card targeting when mixed entities share a tile.
- Include keyboard-access path assertions where practical.
- Maintain App integration coverage for Resume, Discard, malformed save fallback, and replay after resume.
- Maintain persistence regression coverage for non-contiguous seats and invalid active-seat fallback.
- Keep a manual QA fallback scenario for occupied-city city-opening if UI-level automation is incomplete.

## Pass status tracker

| Pass | Status | Notes |
|---|---|---|
| 1. Baseline audit | Done | Baseline docs and command map established. |
| 2. Occupied-city selection | Done | Behavior and regression expectations captured in docs after fix pass. |
| 3. Seat/faction domain decoupling | Done | Runtime `FactionId` now decoupled from semantic `FactionPresetId` with legacy config fallback in `activeSeats`. |
| 4. Setup faction selector UI | Done | Per-seat faction selection and setup validations are implemented. |
| 5. Regression tests | Done | App seam, persistence migration, occupied-city, settings, and target-priority coverage are in place. |
| 6. In-game selection affordances | Done | Friendly occupied-city affordance and enemy stack priority are documented and test-backed. |
| 7. Optional faction gameplay bonuses | Deferred | Out of scope until UX stability is complete. |

## Required closeout per pass

After each pass:

- update `development-log.md`
- update this file's pass statuses and discovered risks
- update `roadmap.md`
- update `test-plan.md`
- update `spec.md` if behavior changed
- update root README only for completed public-facing behavior

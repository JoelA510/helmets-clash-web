# Implementation plan

Current as of 2026-04-27.

Status: pass-1 baseline audit and pass-2 occupied-city fix completed.

## Working state

Goal: resolve playtest-blocking UX issues and create a maintainable path for faction setup and in-game selection improvements.

Constraints:

- Preserve deterministic seeded map generation.
- Preserve existing seat modes: human, AI, empty.
- Preserve autosave/resume where practical.
- Keep changes small and testable.
- Do not implement optional faction bonuses until selection/setup behavior is stable.

Known current hotspots:

- `src/ui/NewGameScreen.tsx` currently uses seat index to display faction presets and to generate default AI names.
- `src/game/state.ts` currently assigns active seats to faction presets by active-seat order.
- `src/game/types.ts` currently defines `SeatConfig` without an explicit faction choice.
- `src/ui/GameScreen.tsx` currently resolves a tile activation by looking up a unit and city at the clicked coordinate, with selection behavior that can make a city inaccessible when a unit is on the same tile.

## Pass 1: baseline audit (completed 2026-04-27)

Prompt: `codex-prompts/01_baseline_repo_audit_and_test_map.md`

Files inspected:

- `src/ui/GameScreen.tsx`
- `src/ui/HexBoard.tsx`
- `src/ui/InfoPanel.tsx`
- `src/ui/CityModal.tsx`
- `src/game/state.ts`
- `src/game/reducer.ts`
- `src/game/types.ts`
- `src/game/constants.ts`
- `src/__tests__/reducer.test.ts`
- `src/__tests__/e2e.test.ts`
- `src/__tests__/components/NewGameScreen.test.tsx`
- `src/__tests__/components/a11y.test.tsx`
- `tests/e2e/setup-and-start.spec.ts`

Current behavior summary:

- `GameScreen.handleHexActivate` checks `unitAt` and `cityAt`, but friendly `unitAt` wins first, so a city on the same tile cannot be opened by first click/Enter.
- With a selected unit, clicking its own occupied city tile falls through to `setSelectedUnit(null)`, which further blocks city management access.
- `CityModal` is wired to `viewerCity` (first city for viewer faction), not a selected/open city id.
- `HexBoard` city glyphs are rendered with `pointerEvents="none"` and do not provide a separate city click target.
- Existing tests had good reducer/combat coverage but no component test covering occupied friendly city access.

Exact intended behavior for occupied city selection:

- Friendly unit only: selecting tile selects unit.
- Friendly city only: selecting tile opens city management.
- Friendly unit + friendly city: keep unit selection behavior and provide a clear explicit city path (`Open city`) without moving unit away.
- Keyboard users must be able to use Enter to select occupied tile + then activate city via focusable control.

Implementation risks:

- Accidentally changing target resolution during card targeting or combat targeting paths in `handleHexActivate`.
- Regressing pass-device flow or autosave by introducing non-stateful city selection.
- Leaking enemy city management access if open-city logic is not gated by faction.

Test strategy:

- Add focused GameScreen component tests for city-only, unit-only, and occupied city tiles.
- Keep existing reducer/mechanics/combat tests as regression net for movement and attack.

Tasks:

- Inspect project structure.
- Identify existing tests and commands.
- Confirm all files that touch setup, seat config, faction presets, initialization, city modal opening, hex activation, and persistence.
- Run current validation commands where possible.
- Update this plan with actual findings.

Expected output:

- no feature changes unless trivial documentation updates are needed
- updated `development-log.md`
- updated `test-plan.md` if current coverage differs from assumptions

## Pass 2: occupied-city selection (completed 2026-04-27)

Prompt: `codex-prompts/02_fix_occupied_city_selection.md`

Likely files:

- `src/ui/GameScreen.tsx`
- `src/ui/HexBoard.tsx`
- `src/ui/InfoPanel.tsx`
- relevant test files under `src/__tests__/` or equivalent

Implemented:

- Added `openCityId` state in `GameScreen` and bound `CityModal` to the selected city id.
- Updated tile activation so selecting a currently selected friendly unit on its own city opens that city.
- Updated city-only activation path to open the exact clicked city.
- Added InfoPanel affordance: `Open city: <name>` when selected friendly unit is on a friendly city.
- Kept existing targeting, attack, movement, pass-device, and autosave flows unchanged.
- Added component regression tests for city-only, unit-only, and occupied-city cases.

Acceptance criteria:

- city management is reachable when a unit occupies the city tile
- selected entity is unambiguous
- tests cover the occupied-city case

## Pass 3: seat/faction domain decoupling

Prompt: `codex-prompts/03_decouple_seat_from_faction_choice_domain.md`

Likely files:

- `src/game/types.ts`
- `src/game/constants.ts`
- `src/game/state.ts`
- `src/game/persist.ts`
- setup tests

Implementation direction:

- Add explicit `factionId` or equivalent faction choice to `SeatConfig`.
- Update defaults so each active seat has a selected faction.
- Update `activeSeats(config)` so it uses selected faction ids.
- Add fallback/migration behavior for configs without explicit faction ids.
- Keep duplicate factions disallowed by default unless a broader runtime identity model is introduced.

Acceptance criteria:

- seat 1 can choose any faction
- seat 2 can choose any remaining faction
- inactive seats do not consume faction choices
- initialization uses selected faction choices rather than active-seat order

## Pass 4: setup faction selector UI

Prompt: `codex-prompts/04_build_setup_faction_selection_ui.md`

Likely files:

- `src/ui/NewGameScreen.tsx`
- `src/game/constants.ts`
- `src/game/types.ts`
- setup tests

Implementation direction:

- Add faction metadata: tagline, tooltip, pros, cons, difficulty/playstyle.
- Render a selector/card/dropdown per active seat.
- Show selected faction visibly.
- Disable or block duplicate choices.
- Make hover tooltip content available on keyboard focus or visible detail panel.

Acceptance criteria:

- each non-empty seat can choose a faction
- faction strengths/pros/cons are visible or accessible
- invalid duplicate selections are prevented or clearly reported
- setup still enforces at least two active seats

## Pass 5: regression tests

Prompt: `codex-prompts/05_add_setup_and_city_interaction_tests.md`

Minimum tests:

- setup validation: at least two active seats
- setup selection: arbitrary seat chooses arbitrary faction
- setup selection: duplicate faction blocked if duplicates disabled
- initialization: selected faction ids map to running game state
- occupied-city: city accessible with unit on same tile
- keyboard/focus path: occupied city interaction remains accessible

## Pass 6: in-game selection affordances

Prompt: `codex-prompts/06_improve_in_game_selection_affordances.md`

Implementation direction:

- Improve selected unit/city/tile display.
- Add `Open city` action when selected unit is on a friendly city.
- Consider stack selector or city badge if not already implemented in Pass 2.
- Avoid large combat or AI changes.

## Pass 7: optional faction gameplay bonuses

Prompt: `codex-prompts/07_optional_light_faction_gameplay_bonuses.md`

Status: deferred until Passes 2-5 are stable.

Guardrails:

- one passive bonus per faction maximum in first pass
- tests required
- no broad economy/combat rewrite

## Required closeout per pass

After each pass:

- update `development-log.md`
- update this file's pass statuses and discovered risks
- update `roadmap.md`
- update `test-plan.md`
- update `spec.md` if behavior changed
- update root README only for completed public-facing behavior

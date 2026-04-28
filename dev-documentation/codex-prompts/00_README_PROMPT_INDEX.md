# Helmets Clash Codex Handoff Prompt Index

Repository: `https://github.com/JoelA510/helmets-clash-web/`

Use these prompts in order unless a later prompt is explicitly marked optional.

## Recommended order

1. `01_baseline_repo_audit_and_test_map.md`
2. `dev-documentation/codex-prompts/02_fix_occupied_city_selection.md`
3. `03_decouple_seat_from_faction_choice_domain.md`
4. `04_build_setup_faction_selection_ui.md`
5. `05_add_setup_and_city_interaction_tests.md`
6. `06_improve_in_game_selection_affordances.md`
7. `07_optional_light_faction_gameplay_bonuses.md`
8. `08_docs_playtest_checklist_and_release_notes.md`
9. `09_post_change_review_prompt.md`

## Core constraints

- Do not weaken TypeScript, lint, unit tests, Playwright tests, or accessibility checks.
- Do not remove autosave/resume, replay, pass-device, fog-of-war, or keyboard controls.
- Do not add large dependencies unless there is a clear benefit and a smaller alternative was rejected.
- Keep changes incremental. Prefer one PR per prompt.
- Preserve the existing game identity: browser-based fantasy turn-based hex strategy.
- Keep the language in the UI consistent. Use "Faction" unless the codebase already clearly standardizes on another term.
- Treat `FactionId` as runtime player/faction identity and introduce a separate preset/civilization identifier if needed.
- Update tests with behavior changes. Do not update snapshots blindly; first verify that UI output changed intentionally.
- Run the repo's available gates before declaring done:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run test:e2e` when UI flow changed

## Known playtest issues to fix

1. Cities are not selectable when a unit is standing on top of the city.
2. The four factions, Aldermere, Grimhold, Sunspire, and Moonwatch, are currently locked to seat/order. Each active seat should be able to select its faction.
3. The setup screen needs clearer faction descriptions, pros/cons, and hover/focus tooltips summarizing faction strengths.

## Current likely hotspots

- `src/ui/GameScreen.tsx`
  - `handleHexActivate`
  - city modal state
  - selected unit handling
  - `HexBoard` props
- `src/ui/HexBoard.tsx`
  - city/unit rendering order
  - click targets, titles, aria labels, cursor behavior
- `src/ui/NewGameScreen.tsx`
  - seat configuration UI
  - currently uses `FACTION_PRESETS[idx]`
- `src/game/types.ts`
  - `FactionPreset`
  - `SeatConfig`
  - `Seat`
  - `FactionState`
  - `GameConfig`
- `src/game/constants.ts`
  - `FACTION_PRESETS`
  - faction metadata
- `src/game/state.ts`
  - `activeSeats(config)`
  - `initialState(config)`
- `src/__tests__/`
  - domain tests for config -> state mapping
  - component/setup tests
  - e2e setup/city interaction flow

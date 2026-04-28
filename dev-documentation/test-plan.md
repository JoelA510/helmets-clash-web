# Test plan

Current as of 2026-04-27.

## Validation commands

Package scripts define these commands:

```bash
npm run lint
npm run test
npm run build
```

Optional E2E flow:

```bash
npm run test:e2e:install
npm run test:e2e
```

Run and record results in `development-log.md` after every implementation pass.

## Coverage goals

### Setup and faction selection

Required tests:

- setup screen requires at least two non-empty seats
- empty seats are ignored for active-player count
- active seats can select any faction, not only the faction matching their seat index
- selected faction is visible for each active seat
- selected faction persists into `GameConfig`
- `initialState(config)` uses selected faction ids, not active-seat order
- duplicate faction choices are blocked or rejected when duplicate factions are disabled
- disabling a seat releases its selected faction for other active seats if applicable
- AI default names update safely when faction selection changes
- old config shapes without explicit faction id are handled by fallback/migration logic

### Occupied-city selection (regression coverage)

Required automated tests:

- friendly city opens when no unit is on the tile
- friendly city remains accessible when a friendly unit is on the tile
- selected friendly unit on a city exposes an explicit city-management path (`Open city` or equivalent)
- repeated interaction on occupied city tiles does not permanently trap selection on unit-only state
- enemy unit/city target behavior does not regress when both occupy the same tile
- active card targeting still works when target tile includes a city and/or unit
- Escape/cancel behavior remains predictable with occupied-city interactions

Required manual regression checks:

- move a friendly unit onto a friendly city, then open city management without moving off-tile
- verify keyboard-only path can reach occupied-city city interaction
- verify selecting enemy stacks still prioritizes valid attack/target semantics during active turn

### Accessibility

Required checks:

- faction selector controls have accessible names
- tooltip or quick-strength content is available through focus or visible detail text, not hover only
- occupied-tile city affordance is keyboard-accessible
- modals/stack selectors use appropriate dialog or listbox semantics where applicable
- focus is not trapped incorrectly after closing city modal or stack selector

### Persistence

Required tests/checks:

- new game config with explicit faction selection can be autosaved/resumed
- older saved configs do not crash the app
- selected unit/city interaction state does not corrupt autosave
- if migration is introduced, migration path is covered by tests or documented manual validation

## Manual QA checklist

Run at least these scenarios manually before closing the milestone:

1. Start a two-player game with Seat 1 as Moonwatch and Seat 2 as Aldermere.
2. Start a three-player game with Seat 1 empty, Seat 2 human, Seat 3 AI, Seat 4 AI, and verify selected factions are honored.
3. Try selecting a faction already chosen by another active seat and confirm the UI blocks or reports it clearly.
4. Move a friendly unit onto its own city, then open the city management UI.
5. Re-select an occupied city tile multiple times and confirm city access remains available.
6. Use keyboard navigation to reach the occupied city interaction path.
7. Save/resume after faction selection and after a unit occupies a city.
8. Run build, lint, and tests.

## Known risk areas

- `FactionId` is currently also used as faction preset identity. This is acceptable while duplicate faction selections are disabled. If duplicates are allowed later, introduce separate runtime faction ids.
- Occupied-tile UI can easily break combat targeting if city/unit priority is changed without tests.
- Saved-game compatibility can break if `SeatConfig` changes without migration/fallback.
- Root-level duplicate prompt files can drift from `dev-documentation/codex-prompts/` unless cleanup is completed.

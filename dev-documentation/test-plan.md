# Test plan

Current as of 2026-05-02.

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
- enemy unit/city target behavior prioritizes the unit first when both occupy the same tile
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
- startup with a valid save shows setup with Resume/Discard instead of auto-entering gameplay
- malformed saves fall back safely to setup
- replay after a resumed game starts a fresh game with the same setup fields
- migrated `activeSeatIdx` remains one of `state.seats[*].idx`, including non-contiguous seats
- selected unit/city interaction state does not corrupt autosave
- if migration is introduced, migration path is covered by tests or documented manual validation

### Settings and preferences

Required tests/checks:

- stored UI preferences continue loading when optional fields such as `aiSpeed` exist
- visible settings only expose controls wired to runtime behavior
- no AI pacing/speed control is visible until real AI turn pacing is implemented

## Manual QA checklist

Run at least these scenarios manually before closing the milestone:

1. Start a two-player game with Seat 1 as Moonwatch and Seat 2 as Aldermere.
2. Start a three-player game with Seat 1 empty, Seat 2 human, Seat 3 AI, Seat 4 AI, and verify selected factions are honored.
3. Try selecting a faction already chosen by another active seat and confirm the UI blocks or reports it clearly.
4. Move a friendly unit onto its own city, then open the city management UI.
5. Re-select an occupied city tile multiple times and confirm city access remains available.
6. Use keyboard navigation to reach the occupied city interaction path.
7. Attack an enemy unit stacked on an enemy city by mouse and keyboard; confirm the unit is targeted before the city.
8. Save/resume after faction selection and after a unit occupies a city.
9. Inject malformed save data and confirm the setup screen remains usable.
10. Run build, lint, and tests.

## Known risk areas

- `FactionId` and `FactionPresetId` are now decoupled; keep regression tests asserting starter deck uid namespace remains runtime `FactionId`-based and not preset-based.
- Occupied-tile UI can easily break combat targeting if unit-before-city attack priority is changed without tests.
- Saved-game compatibility can break if `SeatConfig` changes without migration/fallback.
- Root-level duplicate prompt files can drift from `dev-documentation/codex-prompts/` unless cleanup is completed.

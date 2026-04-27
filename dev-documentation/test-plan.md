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

### Occupied-city selection

Required tests:

- friendly city opens when no unit is on the tile
- friendly city remains accessible when a friendly unit is on the tile
- selected friendly unit on a city exposes a city-management path
- selecting a different friendly unit on a city does not permanently block city access
- enemy unit/city target behavior does not regress
- active card targeting still works when target tile includes a city and/or unit
- Escape/cancel behavior remains predictable

Implemented coverage (2026-04-27):

- `src/__tests__/components/GameScreen.occupied-city.test.tsx`
  - friendly city with no unit remains accessible (keyboard Enter path)
  - friendly unit with no city remains selectable
  - friendly city + friendly unit provides explicit `Open city` action and opens modal
- Existing regression coverage retained for unit movement/attack via:
  - `src/__tests__/combat.test.ts`
  - `src/__tests__/mechanics.test.ts`
  - `src/__tests__/reducer.test.ts`
  - `src/__tests__/e2e.test.ts`

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

### Manual QA checklist

Run at least these scenarios manually before closing the milestone:

1. Start a two-player game with Seat 1 as Moonwatch and Seat 2 as Aldermere.
2. Start a three-player game with Seat 1 empty, Seat 2 human, Seat 3 AI, Seat 4 AI, and verify selected factions are honored.
3. Try selecting a faction already chosen by another active seat and confirm the UI blocks or reports it clearly.
4. Move a friendly unit onto its own city, then open the city management UI.
5. Select a unit standing on a city, then access city management without moving the unit away.
6. Use keyboard navigation to reach the occupied city interaction path.
7. Save/resume after faction selection and after a unit occupies a city.
8. Run build, lint, and tests.

## Known risk areas

- `FactionId` is currently also used as faction preset identity. This is acceptable while duplicate faction selections are disabled. If duplicates are allowed later, introduce separate runtime faction ids.
- Occupied-tile UI can easily break combat targeting if city/unit priority is changed without tests.
- Saved-game compatibility can break if `SeatConfig` changes without migration/fallback.

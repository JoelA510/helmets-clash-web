# Prompt 01 - Baseline repo audit and test map

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Before changing code, map the exact current implementation points for:

1. Occupied-city selection.
2. Seat-to-faction coupling.
3. Setup UI faction presentation.
4. Existing tests that should be extended.

This is a reconnaissance pass. Do not make product changes in this prompt unless they are tiny comments or notes in a working document.

## Context

Early play tests surfaced:

- Cities are not selectable when a unit is standing on the city tile.
- Faction choice was intended to be per-seat selectable among:
  - Aldermere
  - Grimhold
  - Sunspire
  - Moonwatch
- Factions are currently locked to seat/order.
- Setup should display faction descriptions, pros/cons, and a hover/focus strengths tooltip.

Likely files:

- `src/ui/GameScreen.tsx`
- `src/ui/HexBoard.tsx`
- `src/ui/NewGameScreen.tsx`
- `src/game/types.ts`
- `src/game/constants.ts`
- `src/game/state.ts`
- `src/game/reducer.ts`
- `src/game/logic.ts`
- `src/__tests__/`

## Tasks

1. Run the current gates enough to establish a baseline:
   - `npm install` or `npm ci`, whichever the repo supports cleanly.
   - `npm run build`
   - `npm run lint`
   - `npm run test`
   - Do not run Playwright until dependencies are available; if needed, note the install command.
2. Inspect the current city selection flow:
   - Find where click/keyboard activation enters the game screen.
   - Find whether `unitAt` takes priority over `cityAt`.
   - Find whether the city modal can open for arbitrary friendly cities or only the viewer's first city.
   - Find whether `HexBoard` has separate visible/clickable city labels.
3. Inspect the current faction setup flow:
   - Locate `SeatConfig`, `Seat`, `FactionPreset`, and `GameConfig`.
   - Confirm whether `SeatConfig` has any selected faction/preset field.
   - Confirm whether `activeSeats(config)` maps faction by active order or seat index.
   - Confirm whether `NewGameScreen` uses `FACTION_PRESETS[idx]`.
4. Inspect tests:
   - Locate domain tests for `initialState`, `activeSeats`, reducer actions, movement, combat, and setup UI.
   - Locate component and e2e tests for `NewGameScreen` and `GameScreen`.
5. Produce a concise implementation map in a new file:
   - `docs/codex/ux-gameplay-audit.md`
   - Include:
     - current behavior
     - files/functions to edit
     - test files to update
     - risks
     - proposed PR order

## Rules

- Do not weaken or delete tests.
- Do not make behavior changes in this prompt.
- Do not reformat unrelated files.
- Do not introduce new dependencies.
- If a command fails, capture the exact command and relevant error text.

## Done when

- `docs/codex/ux-gameplay-audit.md` exists and is accurate.
- The audit identifies the exact files/functions to change for city selection and faction selection.
- Baseline command results are documented.

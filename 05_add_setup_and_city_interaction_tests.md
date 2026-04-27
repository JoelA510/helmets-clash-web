# Prompt 05 - Add regression tests for setup and city interaction

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Add a focused regression test suite for the two playtest issues:

1. Occupied cities remain selectable.
2. Factions are selected per seat, not locked by seat/order.

This prompt is useful even if earlier prompts already added minimal tests. The goal here is to make the regressions hard to reintroduce.

## Required coverage

### Domain tests

Add or expand tests near existing game state tests.

Cases:

1. `initialState` respects explicit faction choices:
   - Seat 1 chooses Moonwatch.
   - Seat 2 chooses Aldermere.
   - Resulting `FactionState` and city names/colors/glyphs come from those selected presets.
2. Empty seats do not shift selected presets:
   - Seat 1 empty.
   - Seat 2 human chooses Grimhold.
   - Seat 3 AI chooses Sunspire.
   - Runtime faction ids remain unique and selected presets are respected.
3. Duplicate faction handling:
   - If duplicates are blocked, validation rejects them before `initialState`.
   - If duplicates are supported, runtime ids remain unique and both seats initialize without record-key collision.

### Component tests

Add tests for `NewGameScreen`:

1. All four faction choices are rendered.
2. A user can select a different faction for a seat.
3. The selected faction details panel updates.
4. Tooltips or accessible descriptions are present.
5. The submit callback receives the chosen `factionPresetId`.

Add tests for `GameScreen` or its extracted helpers:

1. When a friendly unit and friendly city share a tile, the city can be opened.
2. The friendly unit can still be selected.
3. Keyboard activation over the occupied city provides access to city interaction.
4. Enemy city targeting still works.

### E2E tests

Add one Playwright test if the existing E2E setup makes it practical:

1. Start a new game.
2. Select a non-default faction for Player 1.
3. Begin campaign.
4. Interact with the starting city even though a starting unit is on or near the city.
5. Verify city modal opens.

If deterministic spawn placement makes the occupied-city scenario hard through the UI, add a lower-level component/integration test instead and document why E2E does not cover it.

## Rules

- Prefer stable accessible queries over brittle CSS selectors.
- Do not add arbitrary timeouts.
- Do not update snapshots unless a snapshot is the intended test and the changed output is reviewed.
- Do not skip tests.
- If a test reveals a product bug, fix the bug or document it explicitly.

## Validation commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Done when

- Regression tests fail on the old behavior and pass on the new behavior.
- Test names clearly describe the playtest issue they protect.
- No test relies on random seeds unless the seed is fixed.

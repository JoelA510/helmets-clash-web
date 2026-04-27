# Prompt 02 - Fix occupied-city selection

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Fix the playtest blocker where a city cannot be selected when a unit occupies the same tile.

The player must always have a clear way to interact with a friendly city even when a friendly unit is stationed on it.

## Current issue to verify

In `src/ui/GameScreen.tsx`, the activation flow likely computes:

- `unitAt`
- `cityAt`

Then it prioritizes selecting the friendly unit before opening the city. This makes the city unreachable by direct click/keyboard when a friendly unit sits on the same tile.

## Required behavior

For a tile containing a friendly city and a friendly unit:

- The player can select the unit.
- The player can open the city management modal.
- The UI communicates that both entities are present.
- Keyboard users can access both.
- The fix should not break movement, attack, targeting, fog-of-war, pass-device gating, or autosave.

## Preferred UX pattern

Implement the smallest robust solution that fits the existing UI:

1. If an occupied friendly city is activated with no selected unit:
   - Open a small "tile stack" choice UI, or
   - Select the unit while exposing a clear "Open City" action in the side panel / city banner, or
   - Open the city when clicking the city badge/nameplate and select the unit when clicking the unit.
2. If a friendly unit is already selected and the player activates the friendly city tile:
   - Do not silently clear selection.
   - If the selected unit is already on that city tile, offer/select city access.
   - If another friendly unit is on that city tile, preserve the ability to switch to that unit and still open city.
3. If card targeting or attack targeting is active:
   - Do not let the city selector override valid targeting behavior.
4. If the city is not owned by the viewer:
   - Do not open friendly city management. Preserve existing enemy city attack behavior.

## Implementation guidance

- Consider introducing a small helper:

```ts
type TileOccupants = {
  unit?: Unit;
  city?: City;
  hasFriendlyUnit: boolean;
  hasFriendlyCity: boolean;
};

function getTileOccupants(state: GameState, q: number, r: number, viewerFactionId: FactionId): TileOccupants {
  // Keep this pure and easy to test.
}
```

- If `CityModal` currently uses `viewerCity` only, replace that with selected/open city state:
  - `const [openCityId, setOpenCityId] = useState<number | null>(null);`
  - derive `openCity = state.cities.find(c => c.id === openCityId) ?? null`
  - only allow opening friendly cities for management.
- Avoid assuming there will only ever be one city per faction. This game already has city combat; future capture/multiple-city behavior should not be blocked by this fix.
- If modifying `HexBoard.tsx`, make city labels/badges separate clickable targets if practical.
- Use `button` semantics for any overlay controls that are not part of the SVG, or proper SVG keyboard/aria handling if staying inside SVG.

## Tests to add or update

Add at least one unit/integration test proving:

1. Friendly city with friendly unit on the same tile can still open the city modal.
2. Friendly unit on friendly city remains selectable.
3. Pressing Enter/Space on the keyboard cursor over an occupied friendly city exposes city interaction.
4. Existing enemy attack/city attack behavior still works.

Prefer behavior tests over snapshots.

## Accessibility requirements

- The occupied tile must have accessible text indicating both city and unit presence.
- If a stack-choice UI is added:
  - It must have focus management.
  - Escape closes it.
  - Buttons have clear labels such as `Open Aldermere city` and `Select Knight`.
- If a city badge is added:
  - It must be keyboard reachable or have an equivalent keyboard path.

## Validation commands

Run:

```bash
npm run build
npm run lint
npm run test
```

Run Playwright if any e2e test or user flow is changed:

```bash
npm run test:e2e
```

## Done when

- Occupied friendly cities are selectable.
- Friendly units on cities remain selectable.
- The city modal opens for the correct city, not just the first viewer city.
- Tests cover the regression.
- Build/lint/tests pass or any failures are documented with exact output.

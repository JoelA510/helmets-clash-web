# Prompt 06 - Improve in-game selection affordances and tile clarity

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Improve gameplay UX around selecting tiles, units, cities, and stacked entities.

This prompt is broader than the occupied-city bug fix. It should make the player understand what is under the cursor/hover and what actions are available.

## Dependency

Run after Prompt 02. Do not combine this with the core occupied-city bug fix unless the PR remains small.

## Current UX problem

The player can click hexes, units, and cities, but when entities overlap, the visible interaction model is unclear. City interaction is especially important because recruiting/building depends on it.

## Required improvements

1. Side panel clarity:
   - When hovering or keyboard-cursoring a tile, show:
     - terrain name
     - resource yield
     - occupant unit, if any
     - city, if any
     - owner/faction
     - available actions
   - If a selected unit exists, show whether the hovered tile is:
     - valid move
     - valid attack
     - blocked
     - city interaction
2. Selection state clarity:
   - Clearly indicate whether the current selected object is a unit, city, or tile.
   - If only unit selection exists in state, still expose city/tile context in the side panel.
3. Occupied tile affordance:
   - For city + unit tiles, display a small visible indicator such as:
     - stacked entity count
     - city badge under unit
     - "City + Unit" text in side panel
   - Add an "Open City" button in the side panel when the hovered/cursor tile contains a friendly city.
4. Keyboard:
   - Arrow/Page navigation already exists; preserve it.
   - Enter/Space on an occupied friendly city should not be ambiguous.
   - Add a documented key if needed, such as `C` to open the friendly city under cursor. Only add if it improves clarity and is tested.

## Suggested implementation

- Extract pure helpers:
  - `getTileContext(state, q, r, viewerFactionId)`
  - `getAvailableTileActions(context, selectedUnit, state)`
- Keep helpers in `src/game/` if they are pure domain logic, or `src/ui/` if they are view-specific.
- Update `InfoPanel` to render tile context and actions.
- Avoid adding modals unless the stack-choice UI is already in place from Prompt 02.

## Accessibility

- The board or side panel must expose useful text for screen readers.
- Any added action buttons must be keyboard reachable.
- Do not rely on color alone for move/attack/city states.
- Respect reduced motion.

## Tests

Add/update tests for:

1. Info panel shows both city and unit on occupied city tile.
2. "Open City" action appears for friendly city under hover/cursor.
3. Move/attack affordance text appears when applicable.
4. Keyboard shortcut, if added, opens the city under cursor.
5. No action appears for enemy city management.

## Validation commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Done when

- A player can understand what is on an occupied tile before clicking.
- A friendly city can be opened from a visible action path.
- Unit, city, and terrain context are visible and accessible.

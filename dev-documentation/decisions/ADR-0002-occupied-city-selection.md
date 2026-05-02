# ADR-0002: Occupied city tiles must expose both city and unit interactions

Date: 2026-04-27

Status: accepted/implemented

## Context

Early playtests found that cities were not selectable when a unit occupied the city tile. This blocked core interactions and created a poor strategy-game UX pattern.

A hex tile can contain more than one relevant entity. At minimum, a city tile may also contain a unit. Selection logic must model this explicitly rather than allowing the topmost or first-found entity to hide the other.

## Decision

The UI must expose all relevant selectable entities on a tile.

For the immediate implementation, any of the following are acceptable if tested and accessible:

- stack selector for tiles with multiple entities
- clickable city banner/nameplate above the tile
- side-panel action such as `Open city` when a selected unit stands on a friendly city
- repeated-click or keyboard cycling between unit/city/tile entities

The implemented approach uses a side-panel `Open city` action when a friendly unit shares a friendly city tile. Enemy unit + city attack stacks use explicit unit-before-city priority.

## Rationale

- City management is a primary game action.
- Units commonly stand on cities for defense or staging.
- Blocking city interaction because of unit occupation violates player expectations.
- A tile stack model prevents future regressions when more entities are added.

## Consequences

Positive:

- Players can manage a city without moving the unit away.
- Selection state becomes clearer.
- Future mechanics such as garrisons, siege, and inspections become easier to support.

Negative / risk:

- Changing click priority can regress movement, attack, or targeting behavior.
- Stack selector UI can add complexity if overbuilt.
- Keyboard access must be handled, not added later.

## Acceptance criteria

- A friendly city can be opened when no unit is present.
- A friendly city can be opened when a friendly unit is present.
- The player can distinguish unit selection from city selection.
- Existing movement and attack behavior remains intact.
- Card targeting still works with unit/city overlap.
- Keyboard users have a path to the occupied-city interaction.
- Enemy unit + city stacks have test-backed unit-before-city attack priority.

## Implementation guidance

Future stack UI may still prefer a helper that returns entities at a tile:

```ts
type SelectableEntity =
  | { type: 'unit'; id: number }
  | { type: 'city'; id: number }
  | { type: 'tile'; q: number; r: number };
```

If a richer stack selector is added later, make click/keyboard behavior consume this list rather than independently checking `unitAt` and `cityAt` with hidden priority.

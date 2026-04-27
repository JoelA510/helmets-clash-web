# ADR-0001: Decouple seat configuration from faction choice

Date: 2026-04-27

Status: proposed

## Context

The game currently has four faction presets: Aldermere, Grimhold, Sunspire, and Moonwatch.

The intended setup behavior is that each active seat can choose any available faction. Early playtests identified that factions are effectively locked to seat number. This creates a mismatch between player expectation and game setup behavior.

The current domain model uses faction preset ids such as `f1`, `f2`, `f3`, and `f4`, and active seats are initialized by order. This works only while seat order and faction order are the same concept.

## Decision

Store the chosen faction explicitly on each active seat configuration.

Example direction:

```ts
export type SeatConfig = {
  kind: SeatKind;
  name: string;
  factionId?: FactionId;
};
```

Game initialization must use `seat.factionId` or a validated fallback, not `FACTION_PRESETS[activeSeatIndex]`.

Duplicate faction selection is disabled by default for standard games.

## Rationale

- Matches intended player choice.
- Makes setup behavior explicit and testable.
- Prevents hidden coupling between UI order and game state.
- Allows inactive seats without consuming a faction.
- Enables future setup UX improvements without rewriting initialization.

## Consequences

Positive:

- Seat 1 can choose Moonwatch, Grimhold, Sunspire, or Aldermere.
- Active seats can be reordered or toggled without changing unintended faction identity.
- Tests can verify selected faction ids directly.

Negative / risk:

- Saved game/config shape may change.
- Existing autosaves may lack `factionId` on `SeatConfig`.
- Duplicate faction support cannot be added safely while preset id and runtime faction id are the same concept.

## Migration/fallback requirement

If an existing config has no explicit `factionId`, fallback to the old deterministic mapping only as a compatibility path:

- seat slot 0 -> Aldermere
- seat slot 1 -> Grimhold
- seat slot 2 -> Sunspire
- seat slot 3 -> Moonwatch

This fallback must not remain the primary source of truth for new configs.

## Future option

If duplicate faction selections are later allowed, introduce separate concepts:

- `FactionPresetId`: Aldermere, Grimhold, Sunspire, Moonwatch
- `RuntimeFactionId`: unique id for the actual player/faction instance in a match

Do not allow duplicate presets with the current `FactionId` model unless state collisions are resolved.

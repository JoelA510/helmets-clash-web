# Helmets Clash product and development spec

Current as of 2026-04-27.

Status: draft baseline for the next UX/gameplay implementation pass.

## 1. Purpose

Helmets Clash is a local browser-based turn-based fantasy strategy game. The current focus is playtest-driven UX correction and setup-flow cleanup, not broad balance expansion.

The next implementation should resolve two confirmed playtest issues:

1. Cities are not reliably selectable when a unit occupies the city tile.
2. Faction choice is coupled to seat number, but each active seat should be able to choose from the four factions.

## 2. Core setup requirements

### 2.1 Seats

- The setup screen supports four seat slots.
- A seat can be `human`, `ai`, or `empty`.
- A match must have at least two non-empty seats.
- Empty seats do not participate in game initialization.
- Active seats must have a display name.
- AI display names may default from selected faction names, but faction selection must not be inferred solely from seat index.

### 2.2 Factions

The available factions are:

| Faction | Baseline identity | Expected complexity |
|---|---|---|
| Aldermere | Stable, growth-oriented living faction | Beginner-friendly |
| Grimhold | Defensive undead faction | Moderate |
| Sunspire | Economy and mobility oriented living faction | Moderate |
| Moonwatch | Vision, knowledge, and tactical control oriented living faction | Advanced |

Each faction definition should provide, at minimum:

- stable id
- display name
- city name
- color
- accent color
- glyph
- pattern
- unit pool
- tagline
- short tooltip
- pros
- cons
- recommended playstyle or difficulty label

### 2.3 Seat-to-faction selection

Required behavior:

- Any active seat can select Aldermere, Grimhold, Sunspire, or Moonwatch.
- Faction selection must be stored on the seat config, not derived from seat number.
- Game initialization must use the selected faction for each active seat.
- The UI must make the selected faction visible for each non-empty seat.
- The UI must show a concise tooltip or hover/focus description for each faction choice.
- The UI must expose longer pros/cons text in a visible details panel, expandable card, or equivalent accessible pattern.

Default duplicate policy:

- Standard games should not allow duplicate faction selections.
- If duplicates are not allowed, the UI should disable or clearly block factions already selected by another active seat.
- If duplicate support is later added, runtime faction identity must be separated from faction preset identity to avoid state collisions.

### 2.4 Saved-game compatibility

If `GameConfig` or `SeatConfig` gains a new field such as `factionId`, the app should handle existing local autosaves defensively.

Acceptable approaches:

- provide a migration/fallback from old seat-index behavior to explicit selected faction ids
- discard incompatible saves only with a clear user-facing message
- version saved game state before making incompatible changes

Do not silently crash on older saved-game shapes.

## 3. In-game selection requirements

### 3.1 Tile entity model

A single tile may contain multiple selectable entities:

- terrain/tile
- city
- unit

The UI must not assume that one entity makes the others inaccessible.

### 3.2 Occupied-city selection

Required behavior:

- A city can be selected or opened even when a friendly unit occupies the same tile.
- A city can be inspected even when an enemy unit occupies the same tile, subject to the current game rules and fog/visibility constraints.
- A player must be able to tell whether the current selection target is a unit, a city, or a tile.
- The city management flow must not be blocked solely because a unit is stationed on the city tile.

Acceptable UX implementations:

- stack selector when a tile contains multiple entities
- always-clickable city banner/nameplate layered above the board
- side-panel action such as `Open city` when a unit on a city is selected
- repeated click or keyboard cycle between entities on the same tile

Preferred first implementation:

- Add an explicit occupied-tile selection affordance that exposes both city and unit.
- Keep click behavior predictable and document the priority in this spec.
- Preserve keyboard accessibility.

### 3.3 Selection priority

Baseline priority for implementation:

| Situation | Expected behavior |
|---|---|
| Empty tile | Show tile/terrain information if supported |
| Tile with friendly unit only | Select friendly unit |
| Tile with friendly city only | Open or select city |
| Tile with friendly unit + friendly city | Expose both; selecting city must be possible without moving the unit |
| Tile with enemy unit | Select/target/inspect according to current turn and targeting state |
| Tile with enemy city | Attack/inspect/open according to current turn and targeting state |
| Tile with enemy unit + city | Expose target stack or clear attack target priority |

## 4. Gameplay expansion guardrails

Do not add deeper asymmetric faction mechanics until the setup and selection model is stable.

Allowed near-term expansions:

- faction metadata only
- lightweight passive bonuses if isolated and tested
- better onboarding copy
- better action affordances
- clearer info panel state

Avoid in this pass:

- broad combat rebalance
- new resource systems
- new AI strategy layers
- multiplayer/networking
- major save-format rewrites without migration

## 5. Accessibility requirements

- Controls must be keyboard-accessible.
- Hover-only information must also be available by focus or visible text.
- Buttons and inputs need accessible names.
- Color must not be the only way to distinguish factions.
- Modal/selector flows should preserve focus and allow Escape/cancel behavior where appropriate.

## 6. Testing requirements

At minimum, implementation should add or update tests for:

- active seats requiring explicit faction selection
- every active seat being able to select any available faction
- duplicate faction prevention, if duplicates remain disallowed
- game initialization using selected faction ids rather than active-seat order
- occupied city remaining accessible when a friendly unit is on the city tile
- keyboard or accessible path to city selection when tile contains both city and unit
- existing setup validation still requiring at least two active seats
- saved/resumed config fallback if config shape changes

## 7. Validation commands

```bash
npm run lint
npm run test
npm run build
```

Optional when environment supports it:

```bash
npm run test:e2e:install
npm run test:e2e
```

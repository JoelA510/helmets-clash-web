# Prompt 03 - Decouple seat from faction choice at the domain/model layer

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Allow each active seat to choose a faction preset independently from seat number/order.

Factions available:

- Aldermere
- Grimhold
- Sunspire
- Moonwatch

The current behavior appears to assign faction presets based on active seat order or index. Replace that coupling with explicit per-seat faction selection.

## Design decision

Do not treat the preset id and runtime faction id as the same concept.

Recommended model:

```ts
export type FactionId = 'f1' | 'f2' | 'f3' | 'f4'; // runtime identity, unique per active seat/slot
export type FactionPresetId = 'aldermere' | 'grimhold' | 'sunspire' | 'moonwatch'; // selected civ/faction template

export type FactionPreset = {
  id: FactionPresetId;
  name: string;
  cityName: string;
  color: string;
  accent: string;
  glyph: string;
  pattern: string;
  unitPool: UnitPoolKind;

  tagline: string;
  strengths: string[];
  weaknesses: string[];
  tooltip: string;
  playstyle: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
};

export type SeatConfig = {
  kind: SeatKind;
  name: string;
  factionPresetId: FactionPresetId;
};

export type Seat = {
  idx: number;
  factionId: FactionId;
  factionPresetId: FactionPresetId;
  kind: SeatKind;
  name: string;
};
```

## Constraints

- Runtime `FactionId` must remain unique. Do not key `state.factions` by preset id if duplicate presets might ever be allowed.
- For now, block duplicate selected faction presets in standard setup unless you intentionally add an "Allow duplicates" setting with tests.
- Keep the existing `state.factions: Record<FactionId, FactionState>` shape unless there is a compelling reason to change it.
- Preserve local autosave compatibility where reasonable. If the state/config shape changes, add defensive hydration/migration logic so old saves do not crash the app. At minimum, invalid old saves should be discarded safely with no blank screen.
- Do not weaken existing pass-device or active-seat logic.

## Likely code changes

### `src/game/types.ts`

- Add `FactionPresetId`.
- Extend `FactionPreset`.
- Extend `SeatConfig` with `factionPresetId`.
- Extend `Seat` with `factionPresetId`.
- Consider adding `factionPresetId` to `FactionState` for UI/reporting if useful.

### `src/game/constants.ts`

- Change `FACTION_PRESETS` ids to semantic ids:
  - `aldermere`
  - `grimhold`
  - `sunspire`
  - `moonwatch`
- Add metadata:
  - `tagline`
  - `tooltip`
  - `strengths`
  - `weaknesses`
  - `playstyle`
  - `difficulty`

Suggested copy:

- Aldermere
  - Tagline: `Balanced growth and reliable city development.`
  - Tooltip: `Strong economy and growth. Good for steady expansion.`
  - Strengths: `Reliable economy`, `Fast city development`, `Beginner-friendly`
  - Weaknesses: `Few burst advantages`, `Less specialized military`
  - Playstyle: `Expand steadily, invest in buildings, and win through durable fundamentals.`
  - Difficulty: `Beginner`

- Grimhold
  - Tagline: `Undead pressure, durability, and attrition.`
  - Tooltip: `Durable undead forces and defensive staying power.`
  - Strengths: `Attrition warfare`, `Durable army`, `Strong defensive posture`
  - Weaknesses: `Less flexible economy`, `Can start slower`
  - Playstyle: `Absorb pressure, grind down enemies, and punish overextension.`
  - Difficulty: `Intermediate`

- Sunspire
  - Tagline: `Gold, mobility, and aggressive map tempo.`
  - Tooltip: `Strong mobility and economy. Best for active map control.`
  - Strengths: `Fast scouting`, `Trade/economy tempo`, `Flexible expansion`
  - Weaknesses: `Fragile if pinned down`, `Requires active positioning`
  - Playstyle: `Scout early, control space, and convert tempo into pressure.`
  - Difficulty: `Intermediate`

- Moonwatch
  - Tagline: `Vision, tactics, and careful timing.`
  - Tooltip: `Information and tactical control. Strong for deliberate players.`
  - Strengths: `Superior vision`, `Tactical flexibility`, `Good setup turns`
  - Weaknesses: `Lower direct pressure`, `Punishes poor positioning`
  - Playstyle: `Use vision and timing to take efficient fights.`
  - Difficulty: `Advanced`

### `src/game/state.ts`

- Replace `activeSeats(config)` logic that maps active seats to `FACTION_PRESETS[i].id`.
- Assign unique runtime `FactionId` separately from selected `factionPresetId`.
- Use the selected preset to initialize:
  - display/city name
  - color/accent/glyph/pattern
  - unit pool
  - starter units
  - deck uid namespace should remain runtime `factionId`, not preset id.

Recommended helper:

```ts
const RUNTIME_FACTION_IDS: FactionId[] = ['f1', 'f2', 'f3', 'f4'];

const presetById = (id: FactionPresetId): FactionPreset => {
  const preset = FACTION_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown faction preset: ${id}`);
  return preset;
};
```

## Tests

Add/update domain tests that prove:

1. Seat 1 can start as Moonwatch.
2. Seat 2 can start as Aldermere.
3. Empty seats do not shift selected presets into different seats unexpectedly.
4. `state.factions[factionId]` uses selected preset metadata.
5. `makeStarterDeck` remains namespaced by runtime `FactionId`.
6. Duplicate faction presets are either blocked by validation or explicitly supported.

## Validation commands

```bash
npm run build
npm run lint
npm run test
```

## Done when

- Faction choice is represented explicitly in `GameConfig.seats`.
- `activeSeats(config)` no longer assigns presets by active order.
- Initial state uses the selected preset per seat.
- Existing gameplay still runs.
- Domain tests cover non-default faction selections.

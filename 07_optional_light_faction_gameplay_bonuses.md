# Prompt 07 - Optional light faction gameplay bonuses

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Make faction choice affect gameplay beyond visuals without destabilizing balance.

This is optional. Do this after faction selection and setup UX are stable.

## Design constraints

- Add one passive bonus per faction first. Do not add multiple new systems in one PR.
- Keep bonuses visible in setup and in-game faction details.
- Balance can be rough but must be understandable.
- No hidden bonuses. Players should know why numbers changed.
- Preserve deterministic behavior with seeds.

## Proposed starter pass

### Aldermere - Steady Growth

- Passive: `+1 food per turn from the capital city`, or `starts with +2 food`.
- Intent: beginner-friendly growth/economy.

### Grimhold - Attrition Hold

- Passive: `city regenerates +1 additional HP per turn`, or undead units gain `+1 max HP`.
- Intent: durability/defense.

### Sunspire - Bright Roads

- Passive: first move each turn costs 1 less movement on passable non-mountain terrain, or `starts with +2 gold`.
- Intent: mobility/economy tempo.
- If movement discount is too invasive, use starting gold first.

### Moonwatch - Watchful Start

- Passive: `+1 reveal radius from starting city/units`, or starts with one extra card.
- Intent: vision/tactics.

Recommended lowest-risk implementation:

- Start with resource/vision/card bonuses, not movement-rule changes.
- Defer movement modifications until the UX and tests are stronger.

## Data model

Add explicit bonus metadata to faction presets:

```ts
type FactionBonusId =
  | 'aldermere_growth'
  | 'grimhold_attrition'
  | 'sunspire_tempo'
  | 'moonwatch_vision';

type FactionPreset = {
  // existing fields...
  bonusId: FactionBonusId;
  bonusName: string;
  bonusDescription: string;
};
```

Then implement bonus application in centralized locations:

- Starting resources: `initialState`
- Start-of-turn income/regeneration: likely `src/game/turn.ts`
- Reveal radius: `revealArea` callers
- Card draw: start-of-turn logic

## Required UI

- Setup faction cards show bonus name and description.
- In-game side panel or faction header shows selected faction bonus.
- Help/tutorial mentions faction bonuses briefly.

## Tests

Add domain tests for each bonus:

1. Aldermere bonus applies only to Aldermere.
2. Grimhold bonus applies only to Grimhold.
3. Sunspire bonus applies only to Sunspire.
4. Moonwatch bonus applies only to Moonwatch.
5. Bonuses are tied to selected faction preset, not seat number.
6. Duplicate preset support, if allowed, does not collide.

## Safety checks

- Do not rebalance every unit/building/card in this PR.
- Do not make faction bonuses depend on display name.
- Do not key logic off glyph/color/pattern.
- Do not alter save format without migration/defensive handling.

## Validation commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Done when

- Each faction has exactly one clear passive gameplay hook.
- The bonus is visible in setup and gameplay.
- Tests prove bonuses follow selected faction preset, not seat/order.

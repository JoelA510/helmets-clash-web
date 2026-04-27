# Prompt 04 - Build setup faction selection UI with descriptions and tooltips

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Update the new-game setup screen so each active seat can choose one of the four faction presets:

- Aldermere
- Grimhold
- Sunspire
- Moonwatch

The setup UI must include descriptions, pros/cons, and hover/focus tooltips with quick strengths.

## Dependency

Run this after Prompt 03, or first implement the Prompt 03 model changes in the same PR if this is being combined.

## Current issue

`src/ui/NewGameScreen.tsx` appears to render each seat using `FACTION_PRESETS[idx]`, which locks faction identity to seat/order. Replace that with explicit seat config state.

## Required UI behavior

For each non-empty seat:

- Show selected faction glyph/color/name.
- Allow changing the faction via accessible controls.
- Show:
  - faction name
  - tagline
  - difficulty
  - playstyle summary
  - strengths
  - weaknesses
- Provide quick hover/focus tooltip:
  - one short sentence
  - no more than 1-2 lines
  - visible on mouse hover and keyboard focus

For empty seats:

- Hide or disable faction selection.
- Preserve their configured/default faction choice in state if practical, but do not validate it.

Validation:

- Start is disabled unless there are at least two non-empty seats.
- Start is disabled if any active seat lacks a faction selection.
- If duplicate factions are not supported, start is disabled when duplicate active seats select the same faction.
- Show clear inline validation messages.

## Suggested layout

Use a compact card per seat:

```text
Seat 1 · Human
[Player name input] [Human/AI/Empty button]

Faction
[ Aldermere card selected ] [ Grimhold card ] [ Sunspire card ] [ Moonwatch card ]

Selected details:
Aldermere - Balanced growth and reliable city development.
Strengths: Reliable economy, Fast city development, Beginner-friendly
Weaknesses: Few burst advantages, Less specialized military
```

On smaller screens, stack cards vertically.

## Accessibility

- Use native radio buttons or a radio-group pattern for faction choices.
- The selected card must not be represented by color alone.
- Tooltip must appear on focus as well as hover.
- Validation messages should use `role="alert"` or be associated with fields.
- Buttons/inputs must keep visible focus rings.
- No keyboard trap.

## Code guidance

- Do not duplicate faction copy in the component. Read from `FACTION_PRESETS`.
- Add helper functions as needed:
  - `setSeatFactionPreset(idx, factionPresetId)`
  - `selectedPresetForSeat(seat)`
  - `activeDuplicateFactionIds(config)`
- Avoid large component bloat. If `NewGameScreen.tsx` becomes unwieldy, extract:
  - `FactionChoiceCard`
  - `SeatSetupRow`
  - `FactionDetailsPanel`
  into nearby files under `src/ui/`.
- Keep code type-safe. No stringly-typed faction ids outside the central type.

## Tests

Add/update component tests for:

1. All four faction names are visible in setup.
2. A seat can change from default faction to Moonwatch.
3. Submitting setup sends the selected faction preset id.
4. Tooltip text appears on hover/focus, or at minimum the tooltip content is accessible through `aria-describedby`.
5. Duplicate selections show validation if duplicates are blocked.
6. Empty seats do not require faction selection.

Update snapshots only if they fail due intentional UI structure changes.

## Validation commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Done when

- Every active seat has an explicit faction selector.
- The four faction options are no longer locked to seat number.
- Pros/cons and tooltip text come from central faction metadata.
- Tests cover selection and validation.

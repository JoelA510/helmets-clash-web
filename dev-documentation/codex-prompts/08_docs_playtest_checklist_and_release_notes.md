# Prompt 08 - Docs, playtest checklist, and release notes

You are working in `https://github.com/JoelA510/helmets-clash-web/`.

## Goal

Update documentation so the repo accurately reflects the new UX/gameplay behavior after the city-selection and faction-selection changes.

## Files to inspect/update

- `README.md`
- Existing docs under `docs/`, if any.
- `src/ui/HelpModal.tsx`
- `src/ui/TutorialOverlay.tsx`
- Any test docs or playtest notes.

## Required README updates

Update these sections if present:

1. Gameplay overview
   - Explain that players configure seats and choose factions independently.
2. Factions
   - Include Aldermere, Grimhold, Sunspire, Moonwatch.
   - Add one-line identity for each.
   - Mention strengths/weaknesses are visible in setup.
   - Mention gameplay bonuses only if Prompt 07 was implemented.
3. Controls
   - Explain how to interact with a city when a unit occupies the same tile.
   - Include keyboard behavior.
4. Test commands
   - Keep current command list accurate.
5. Backlog
   - Remove completed items.
   - Add any known remaining UX/balance gaps.

## Help/tutorial updates

- Update "Your City" text if the city interaction path changed.
- Mention the city remains accessible even when occupied.
- Mention faction selection if onboarding/setup copy exists.
- Keep copy short.

## Add a playtest checklist

Create:

`docs/playtest-checklist.md`

Include scenarios:

1. New game setup
   - 2-player human vs AI.
   - 4-player mixed human/AI.
   - Each seat chooses a non-default faction.
   - Duplicate faction validation, if applicable.
2. City interaction
   - Starting city with unit on top.
   - Friendly unit moved onto city.
   - Enemy near city.
   - Keyboard activation over occupied city.
3. Turn flow
   - End turn with pending actions.
   - Pass-device gate between human seats.
   - AI turn behavior.
4. Combat
   - Unit attack.
   - City attack.
   - Attack target on occupied tile.
5. Persistence
   - Autosave.
   - Resume.
   - Discard save.
6. Accessibility
   - Keyboard-only setup.
   - Keyboard-only city open.
   - Reduced motion.
   - High contrast, if available.

## Add release notes

Create or update:

`docs/release-notes.md`

Include a concise entry:

- Changed: seats can choose factions independently.
- Fixed: cities remain accessible when occupied by units.
- Added: faction strengths/pros/cons in setup.
- Added: regression tests.
- Known issues: remaining balance/gameplay rough edges.

## Validation commands

```bash
npm run build
npm run lint
npm run test
```

Run E2E if help/tutorial/setup UI changed:

```bash
npm run test:e2e
```

## Done when

- README reflects actual behavior.
- Help/tutorial copy does not contradict the UI.
- Playtest checklist exists.
- Release notes summarize the change.

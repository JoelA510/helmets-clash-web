# Prompt 09 - Post-change Codex review prompt

You are reviewing `https://github.com/JoelA510/helmets-clash-web/` after the UX/gameplay changes.

## Goal

Audit the implementation for correctness, regressions, and scope creep.

Do not make changes unless the fix is trivial and clearly safe. Prefer a findings report first.

## Review scope

Check the completed changes for:

1. Occupied city interaction
   - Friendly city + friendly unit on same tile.
   - Friendly city + selected unit.
   - Enemy city targeting.
   - Keyboard activation.
   - Side panel or stack selector clarity.
2. Seat/faction selection
   - `SeatConfig` stores faction preset explicitly.
   - Runtime `FactionId` remains unique.
   - Preset id and runtime faction id are not conflated.
   - Empty seats do not cause preset/order shifts.
   - Duplicate handling is deliberate and tested.
3. Faction metadata
   - Faction descriptions are centralized.
   - Setup UI and help/docs do not duplicate stale copy.
   - Tooltip works on hover and focus.
4. Tests
   - Regression tests cover the two reported playtest issues.
   - Tests use deterministic seeds.
   - No skipped tests were introduced.
   - Snapshots were not updated blindly.
5. Accessibility
   - Faction selection is keyboard usable.
   - Occupied tile city access is keyboard usable.
   - Focus rings remain visible.
   - Tooltips/descriptions are accessible.
6. Persistence
   - Existing saves do not crash the app after config shape changes.
   - Autosave and resume still work.
7. Build quality
   - TypeScript, lint, unit tests, and e2e tests pass or failures are documented.

## Commands to run

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

If Playwright browsers are missing, run the repo's install command first if documented.

## Output format

Produce:

```md
# Post-change review

## Decision
Pass / Pass with follow-ups / Block

## Verified
- ...

## Blocking issues
- File:
  - Issue:
  - Evidence:
  - Fix:

## Non-blocking follow-ups
- ...

## Test results
| Command | Result | Notes |
|---|---:|---|

## Risk notes
- ...

## Recommended next PR
...
```

## Rules

- Do not approve if city access still depends on unit absence.
- Do not approve if faction selection still depends on seat index or active order.
- Do not approve if runtime faction identity can collide.
- Do not approve if keyboard users cannot perform the core new interactions.

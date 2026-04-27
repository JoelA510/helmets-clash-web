# Playtest findings

Current as of 2026-04-27.

## Confirmed issues

### 1. Cities are blocked when units occupy the same tile

Severity: high

Observed behavior:

- When a unit is on top of a city, the city is not currently selectable through normal interaction.
- This blocks important city interactions such as management, recruitment, construction, or inspection.

Expected behavior:

- City interactions must remain accessible even when a unit is stationed on the city tile.
- If multiple entities occupy a tile, the UI should expose both clearly.

Development references:

- `spec.md` section 3
- `decisions/ADR-0002-occupied-city-selection.md`
- `codex-prompts/02_fix_occupied_city_selection.md`

### 2. Faction choice is locked to seat number

Severity: high

Observed behavior:

- Faction/civilization choice is effectively mapped to seat number.
- This prevents each seat from independently choosing Aldermere, Grimhold, Sunspire, or Moonwatch.

Expected behavior:

- Each active seat should choose from the four factions.
- Faction descriptions and strengths should be visible in setup.
- Hover/focus should expose quick strengths tooltip content.

Development references:

- `spec.md` section 2
- `decisions/ADR-0001-seat-faction-decoupling.md`
- `codex-prompts/03_decouple_seat_from_faction_choice_domain.md`
- `codex-prompts/04_build_setup_faction_selection_ui.md`

## Proposed faction copy baseline

| Faction | Tagline | Quick strengths | Pros | Cons |
|---|---|---|---|---|
| Aldermere | Stable crownlands built around growth and reliable city development. | Growth, stability, forgiving economy. | Reliable economy; strong city development; easiest first faction. | Less explosive; fewer specialized military tricks. |
| Grimhold | Grim fortress realm using undead units and attrition pressure. | Defense, durability, attrition. | Strong defensive posture; undead unit identity; good at holding territory. | Slower expansion; less flexible early economy. |
| Sunspire | Bright trade empire focused on movement, scouting, and gold tempo. | Economy, mobility, map control. | Strong tempo; flexible expansion; good scouting pressure. | Vulnerable if pinned early; requires active positioning. |
| Moonwatch | Nocturnal watch order built around vision, knowledge, and tactical control. | Vision, research feel, tactical setup. | Better information; strong planning identity; advanced tactical play. | Lower brute force; punishes poor positioning. |

## Future playtest questions

- Is occupied-tile selection obvious without explanation?
- Do players understand the difference between selecting a unit, city, and tile?
- Are faction descriptions enough to choose a preferred style?
- Does blocking duplicate factions feel restrictive or useful for clarity?
- Does the setup screen still feel fast after adding faction details?
- Are city actions discoverable after a unit moves onto the city?

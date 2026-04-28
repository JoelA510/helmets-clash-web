# Helmets Clash development roadmap

Current as of 2026-04-27.

Status key:

- `Not started`
- `In progress`
- `Blocked`
- `Done`
- `Deferred`

| Order | Status | Roadmap item | Description | Primary docs/prompts |
|---:|---|---|---|---|
| 1 | Not started | Baseline repo audit | Confirm current file structure, tests, state model, setup flow, and city/unit selection behavior before modifying code. | `codex-prompts/01_baseline_repo_audit_and_test_map.md` |
| 2 | Not started | Occupied-city selection fix | Ensure cities remain selectable/manageable when a unit occupies the same tile. | `dev-documentation/codex-prompts/02_fix_occupied_city_selection.md`, `dev-documentation/decisions/ADR-0002-occupied-city-selection.md` |
| 3 | Not started | Seat/faction domain decoupling | Store explicit faction choice on seat config and initialize active seats from selected factions instead of array order. | `codex-prompts/03_decouple_seat_from_faction_choice_domain.md`, `decisions/ADR-0001-seat-faction-decoupling.md` |
| 4 | Not started | Setup faction selector UI | Add per-seat faction selection UI, descriptions, pros/cons, and accessible quick-strength tooltips. | `codex-prompts/04_build_setup_faction_selection_ui.md` |
| 5 | Not started | Regression tests | Add tests around setup faction selection and occupied-city interaction. | `codex-prompts/05_add_setup_and_city_interaction_tests.md`, `test-plan.md` |
| 6 | Not started | In-game selection affordance cleanup | Improve side-panel/action affordances so selected unit/city/tile state is clear. | `codex-prompts/06_improve_in_game_selection_affordances.md` |
| 7 | Deferred | Light faction gameplay bonuses | Add small faction-specific mechanics only after setup and selection bugs are stable. | `codex-prompts/07_optional_light_faction_gameplay_bonuses.md` |
| 8 | Not started | Docs and playtest checklist | Update README/dev docs with completed behaviors, test status, and playtest checklist. | `codex-prompts/08_docs_playtest_checklist_and_release_notes.md` |
| 9 | Not started | Post-change review | Run a final Codex review after implementation to detect regressions, UX gaps, and stale docs. | `codex-prompts/09_post_change_review_prompt.md` |

## Immediate milestone

Milestone: UX correctness pass.

Definition:

- city interactions are no longer blocked by unit occupation
- active seats choose factions independently
- setup screen explains faction tradeoffs
- regression tests cover both playtest issues
- documentation reflects implemented behavior

## Out-of-scope for immediate milestone

- online multiplayer
- major AI rewrite
- major combat rebalance
- campaign progression
- account system
- monetization/storefront work

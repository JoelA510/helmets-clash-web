# Manifest

Current as of 2026-04-27.

This package contains a complete `dev-documentation/` directory for `JoelA510/helmets-clash-web`.

## Included root docs

- `README.md`
- `CODEX_HANDOFF.md`
- `spec.md`
- `roadmap.md`
- `implementation-plan.md`
- `test-plan.md`
- `playtest-findings.md`
- `development-log.md`

## Included ADRs

- `decisions/ADR-0001-seat-faction-decoupling.md`
- `decisions/ADR-0002-occupied-city-selection.md`

## Included Codex prompt packets

- `codex-prompts/00_README_PROMPT_INDEX.md`
- `codex-prompts/01_baseline_repo_audit_and_test_map.md`
- `dev-documentation/codex-prompts/02_fix_occupied_city_selection.md`
- `codex-prompts/03_decouple_seat_from_faction_choice_domain.md`
- `codex-prompts/04_build_setup_faction_selection_ui.md`
- `codex-prompts/05_add_setup_and_city_interaction_tests.md`
- `codex-prompts/06_improve_in_game_selection_affordances.md`
- `codex-prompts/07_optional_light_faction_gameplay_bonuses.md`
- `codex-prompts/08_docs_playtest_checklist_and_release_notes.md`
- `codex-prompts/09_post_change_review_prompt.md`

## Import instruction

Copy the contained `dev-documentation/` directory to the repository root.

Then give Codex this starting instruction:

```text
Read ./dev-documentation/CODEX_HANDOFF.md and follow it. Start with the baseline audit prompt. Do not modify application code until you have updated ./dev-documentation/implementation-plan.md with the planned changes.
```

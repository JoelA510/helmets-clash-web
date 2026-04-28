# dev-documentation

Current as of 2026-04-27.

This directory is the development control center for Helmets Clash. It is intended for Codex-assisted development, human review, and playtest-driven iteration.

Use this directory to keep requirements, implementation plans, tests, decisions, and work logs synchronized as the game evolves.

## Directory map

```text
dev-documentation/
  README.md
  CODEX_HANDOFF.md
  spec.md
  roadmap.md
  implementation-plan.md
  test-plan.md
  playtest-findings.md
  development-log.md
  decisions/
    ADR-0001-seat-faction-decoupling.md
    ADR-0002-occupied-city-selection.md
  codex-prompts/
    00_README_PROMPT_INDEX.md
    01_baseline_repo_audit_and_test_map.md
    02_fix_occupied_city_selection.md
    03_decouple_seat_from_faction_choice_domain.md
    04_build_setup_faction_selection_ui.md
    05_add_setup_and_city_interaction_tests.md
    06_improve_in_game_selection_affordances.md
    07_optional_light_faction_gameplay_bonuses.md
    08_docs_playtest_checklist_and_release_notes.md
    09_post_change_review_prompt.md
```

## How Codex should use this directory

- Treat `spec.md` as the stable behavior contract.
- Treat `roadmap.md` as the ordered backlog.
- Treat `implementation-plan.md` as the current working plan.
- Treat `test-plan.md` as the validation contract.
- Treat `playtest-findings.md` as the source of user-observed issues.
- Treat `development-log.md` as the work journal.
- Treat `decisions/` as the record of design choices that should not be rediscovered repeatedly.
- Treat `codex-prompts/` as bounded task packets.

## Update rule

Every code change that affects gameplay, setup flow, selection behavior, persistence shape, tests, or public behavior must update at least one file in this directory.

Do not use these files as stale notes. Keep them current as development proceeds.

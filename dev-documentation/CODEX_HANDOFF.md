# Codex handoff: development-control workflow

Current as of 2026-04-27.

## Repository

Repository: `JoelA510/helmets-clash-web`

Project: browser-based fantasy strategy game built with React, TypeScript, Vite, and Tailwind CSS.

## Goal

Use `./dev-documentation/` as a living development-control directory. The prompt files under `./dev-documentation/codex-prompts/` are task packets. The durable requirements extracted from those prompts belong in `spec.md`, `roadmap.md`, `implementation-plan.md`, `test-plan.md`, `playtest-findings.md`, `development-log.md`, and `decisions/`.

## Operating rules

Before changing code:

1. Read `./dev-documentation/spec.md`.
2. Read `./dev-documentation/implementation-plan.md`.
3. Read the relevant task packet under `./dev-documentation/codex-prompts/`.
4. Inspect the current implementation before editing.
5. Update `implementation-plan.md` with the planned files, risks, and expected behavior changes.
6. Add or update tests before or alongside behavior changes.

After changing code:

1. Update `development-log.md` with date, summary, files changed, commands run, pass/fail results, and follow-ups.
2. Update `spec.md` if user-facing behavior changed.
3. Update `test-plan.md` if coverage changed.
4. Update `roadmap.md` by marking items complete, blocked, deferred, or newly discovered.
5. Add or update ADRs when a decision affects future development.
6. Update the root `README.md` only if public-facing behavior, setup instructions, gameplay summary, or backlog changed.

## Current priority order

1. Fix occupied-city selection so cities remain accessible when a unit occupies the same tile.
2. Decouple faction choice from seat number.
3. Add per-seat faction selection UI.
4. Add faction descriptions, pros/cons, and quick hover strength tooltips.
5. Add regression tests for setup selection and occupied-city interaction.
6. Improve in-game selection affordances.
7. Consider light faction gameplay bonuses only after the UX/state model is stable.

## Hard constraints

- Do not weaken existing tests.
- Do not remove accessibility behavior.
- Do not bypass TypeScript, lint, or test failures.
- Do not hide broken behavior behind TODO comments.
- Preserve deterministic seeded map generation.
- Preserve autosave/resume compatibility where practical.
- If saved-game shape migration is needed, document the migration behavior in `spec.md` and `development-log.md`.
- Keep changes small and reviewable.
- Stop and report if the current task expands into a broad refactor beyond its prompt scope.

## Validation commands

Use commands from `package.json`:

```bash
npm run lint
npm run test
npm run build
```

If Playwright dependencies are installed or can be installed safely:

```bash
npm run test:e2e:install
npm run test:e2e
```

Record exact pass/fail results in `development-log.md`.

## Definition of done

A task is not complete unless:

- behavior matches `spec.md`
- relevant tests are added or updated
- existing validation commands pass, or failures are documented with exact output
- `development-log.md` is updated
- `implementation-plan.md` and `roadmap.md` reflect current status
- root `README.md` is updated only when public-facing behavior changed

# AGENTS.md

Helmets Clash is a local browser-game prototype. Start with [README.md](README.md).
For code work, follow [the development handoff](dev-documentation/CODEX_HANDOFF.md),
read the relevant spec and implementation plan, and inspect current code before
choosing a task. The handoff's dated priority list is historical context; the
user's current task and current implementation determine what is still needed.

## Boundaries that matter

- Keep typed game logic in `src/game/` separate from presentation in `src/ui/`.
- Preserve deterministic seeded generation. A reproduction should record its seed
  and setup; use synthetic saves and replays in tests.
- Preserve autosave/resume compatibility where practical. If a saved-state shape
  changes, test old and malformed saves and document migration behavior in the
  spec and development log.
- Preserve keyboard and accessibility behavior. Do not weaken checks to ship a fix.
- The human/AI seats are local game participants. Do not add accounts, online
  multiplayer, telemetry, or backend services as an incidental part of a game fix.

## Verification

Use Node 24 from `.nvmrc` and `npm ci`. For code changes run `npm run typecheck`,
`npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`.
Install Chromium with `npm run test:e2e:install` when needed; report a missing
browser as an unrun check, not a pass. CI installs system dependencies as well.

[CI](.github/workflows/ci.yml) pins its E2E runner to Ubuntu 24.04 for compatibility
with the installed Playwright version. Verify browser installation before changing
that runner or Playwright. Keep required job names aligned with the ruleset.
For documentation-only changes, check links and formatting and name omitted
application checks. Follow the handoff's documentation updates for behavior changes.

## Security and review

Read [SECURITY.md](SECURITY.md) before sharing a suspected vulnerability. Public
issues, PRs (including drafts), logs, and artifacts are not private channels.
Use synthetic evidence and coordinate disclosure with the maintainer.

Draft-only requests remain draft PRs and must not be merged. Record exact checks
and their results; do not treat review approval as evidence that CI passed.

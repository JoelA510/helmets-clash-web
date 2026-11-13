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

## Code review rules

Use these rules when a review is requested or required; they do not add review rounds.
Apply code and test checks to executable changes, not prose-only edits.

- Review the diff and affected callers for correctness, security, data loss, concurrency,
  and error-handling defects. Leave formatting and lint findings to CI.
- Order findings by severity. Each gives severity, `path:line`, the concrete trigger and
  consequence, and a fix. Mark it confirmed (reproduced or traced through code) or plausible
  (state the missing evidence); distinguish static review from executed checks.
- Trace validation of external input (users, files, network responses, environment) before
  use. Flag missing validation, swallowed errors, or blank values treated as zero when they
  hide a failure or violate the expected contract; respect documented best-effort cleanup.
- Flag new logic without meaningful test coverage, including an edge case. A test claiming
  to cover changed behavior must fail without that behavior; this does not apply to unrelated
  tests. State whether failure was demonstrated or only inferred.
- Flag new dependencies, network calls, or stored-data shape changes absent from the PR
  description. Disclosure does not replace any required approval.
- Flag changes outside the PR's stated purpose. If no defects are found, say so in one line
  and identify the review scope and unrun checks without implying runtime validation.
- Follow this repository's security-reporting rules for sensitive findings; keep exploit
  details and private data out of public review comments.

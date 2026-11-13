# Prompt run log

One row per run of a project prompt (`new-project.md`, `existing-project.md`), newest last. The
day-to-day prompts (`discovery.md`, `investigate.md`, `review.md`, `pre-pr.md`) aren't logged
here; the PR, issue, or discovery pass they lead to is their record. The point is
recoverability: six months after a stack was chosen or an audit was executed, this is the
fastest path back to what was actually asked, what came out of it, and which references were
current at the time.

Add a row when a run starts, and fill in the outcome columns when it finishes. If a run was
abandoned, say so and why — an abandoned run is often more informative than a clean one.

| Date | Prompt | Target | Inputs (summary) | Outputs | References verified? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| _yyyy-mm-dd_ | new / existing | repo or app name | one line: what was asked for, key constraints | files or milestones produced | yes (date) / skipped — offline / partial | what changed in the prompt as a result, open items |
| 2026-10-12 | existing | helmets-clash-web (`JoelA510/helmets-clash-web`, public) | Template trial of agent-ready-template 1.0.0-rc.2 (`31da102`) through the `complete` skill: bring the deployed portfolio game to production grade. Plan-only: milestone 1 not executed; no change to the game's source, config, dependencies or CI. | Phases 0-2 in `dev-documentation/audits/2026-10-production-readiness/`: verification record, audit of `704ead8` (39 findings; worst: a game whose first seat is AI can't be played, blocker; Exit to main menu deletes the save, high), remediation plan (7 milestones, status NOT STARTED). Milestone 1 not executed (plan-only). Trial findings in `docs/template-trial.md`. | yes (2026-10-12): no listed reference fits a client-only game; ixartz/Next-js-Boilerplate verified by git for its tooling checklist only; official releases as yardsticks | Gaps in the prompt, reported to the template rather than edited here: the scorecard's `node.strict-types` fails a TypeScript 6 project that is strict by default; packs scored but not delivered; no audit area for broken core flows; the scorecard command omits `--visibility`; `check:settings` not in the prompt; skill and prompt disagree on the audit folder and on asking for the definition of complete. Open: three owner decisions in the plan (all-AI games, error reporter, license). |

## Longer write-ups

When a run produces reasoning that won't fit in a row — a rejected stack, a migration that was
considered and declined, an audit finding that reshaped the plan — write it up as an ADR in this
repo's decision records (`docs/adr/` in the layout the skeletons use, or wherever the repo
already keeps them) and link the ADR from the row. Keep this table scannable.

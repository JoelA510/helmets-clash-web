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
| 2026-10-12 | existing | helmets-clash-web (`JoelA510/helmets-clash-web`, public) | Template trial of agent-ready-template 1.0.0-rc.2 (`31da102`) through the `complete` skill: bring the deployed portfolio game to production grade. Plan-only: milestone 1 not executed; no change to the game's source, config, dependencies or CI. | In progress: Phases 0-2 into `dev-documentation/audits/2026-10-production-readiness/`; trial findings in `docs/template-trial.md`. | in progress | Started 2026-10-12. |

## Longer write-ups

When a run produces reasoning that won't fit in a row — a rejected stack, a migration that was
considered and declined, an audit finding that reshaped the plan — write it up as an ADR in this
repo's decision records (`docs/adr/` in the layout the skeletons use, or wherever the repo
already keeps them) and link the ADR from the row. Keep this table scannable.

# Template trial: existing-repository audit of Helmets Clash

Labels on every claim: *statically reviewed* (read), *executed* (ran it), *fully validated*
(ran it and checked the outcome).

## Setup

- **Trial name:** helmets-clash-web / existing-repository trial: the process half of
  agent-ready-template delivered into an existing public game repository with `process:apply`,
  then run through the delivered `complete` skill (`.claude/skills/complete/SKILL.md`, which runs
  `prompts/existing-project.md`), plan-only. This is the existing-repository trial that ADR 0014
  and CONTRIBUTING.md §8 require before 1.0.0.
- **Date:** 2026-10-12
- **Template commit:** `31da102` (`31da102ca31b…`, "Record both new-repository trials, and say
  what a trial has to show (#6)"; package.json `1.0.0-rc.2`, release `v1.0.0-rc.2` plus fixes),
  checkout at `/home/user/agent-ready-template`, `node_modules` already installed. Read and run,
  never modified (`git status --short` empty at the end). *Executed.*
- **Target:** `JoelA510/helmets-clash-web` (public, per the GitHub REST API), branch
  `claude/vibrant-allen-hr7y7s`, starting at `704ead8` (equal to `origin/main`): a Vite 8 +
  React 19 + TypeScript 6 browser game, 116 commits, deployed on Vercel. It had its own process
  already: `dev-documentation/` (spec, plans, a development log, two ADRs, ten Codex prompt
  packets) and `HARDENING_PLAN.md`; no CI, no AGENTS.md or CLAUDE.md.
- **Environment:** Claude Code on the web (cloud container, Linux 6.18), Node v22.22.0,
  npm 10.9.4, git 2.43.0. GitHub REST through the session proxy (GraphQL refused); other
  repositories' API answered 403. The sandbox's Playwright browsers (`/opt/pw-browsers`,
  Chromium build 1194) didn't match the target's Playwright 1.59.1.
- **Inputs:** none given beyond the trial brief. Every project input was filled from the
  repository and GitHub, with the assumptions stated in the audit's header. Constraint added by
  the brief: "plan-only: this run is a template trial. Don't execute milestone 1, and don't change
  the game's source, config, dependencies or CI."

### Commands and trimmed output

```text
$ npm run process:apply -- --target /home/user/helmets-clash-web      # template checkout; exit 0
process assets -> /home/user/helmets-clash-web
Copied:
  + .agents/skills/{bootstrap,complete,discovery,plan-change,pre-pr,review-change,root-cause,
    template-update,verify}/SKILL.md
  + .claude/skills/{same nine}/SKILL.md
  + prompts/{README,discovery,existing-project,investigate,new-project,plan-change,pre-pr,
    review,run-log,template-update,verify}.md
  + prompts/skeletons/ (22 files)
  + prompts/standards/README.md, prompts/standards/core/ (20 files)
Recorded prompts/.apply-manifest.json: what each delivered file was, ...
Next steps, in the target repo: 1. keep formatters off ...; 2. commit this delivery as it is ...;
3. pick the workflow ... existing code -> the complete skill; 4. skeletons are staged; 5. record
the run in prompts/run-log.md; 6. day-to-day skills.
```

72 files plus the manifest, committed unmodified as `f9a0c01`. The target runs no formatter, so
step 1 needed nothing. *Executed.*

```text
# Baseline, in a separate clone of 704ead8 (scratch directory)
$ npm ci                     # exit 0: added 342 packages in 12s; 21 vulnerabilities (2 low, 6 moderate, 13 high)
$ npm run lint               # exit 0, no output
$ npx tsc -b --noEmit        # exit 0 (no typecheck script exists)
$ npm run test               # exit 0: Test Files 21 passed (21); Tests 223 passed (223)
$ npm run build              # exit 0: index-*.js 286.69 kB │ gzip: 88.59 kB
$ npm run test:e2e           # exit 1: browserType.launch: Executable doesn't exist at
                             #   /opt/pw-browsers/chromium_headless_shell-1217/...
$ PLAYWRIGHT_BROWSERS_PATH=<scratch>/pw npx playwright install chromium   # exit 0
$ PLAYWRIGHT_BROWSERS_PATH=<scratch>/pw npm run test:e2e                  # exit 1: 1 passed, 1 failed
  ✘ settings modal opens and respects theme change: <div class="fixed inset-0 bg-black/60 ...">
    intercepts pointer events (the tutorial dialog)
$ npm audit                  # exit 1: {"low":2,"moderate":6,"high":13,"critical":0}; --omit=dev: 0

# From the template checkout
$ npm run check:conformance -- --root /home/user/helmets-clash-web       # exit 1
Packs (detected): core, node, vite-spa
12 fail, 1 skipped, 5 pass, 5 n/a, 7 audit. Template 1.0.0-rc.2 (31da102ca31b), 2026-10-12.
$ node scripts/check-conformance.mjs --root <target> --visibility public  # exit 1
13 fail, 5 pass, 5 n/a, 7 audit.
$ node scripts/check-conformance.mjs --root <clone of 704ead8> --visibility public
14 fail, 3 pass, 6 n/a, 7 audit.      # core.process-delivered fails; core.instructions-resolve n/a
$ NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
    node scripts/check-settings.mjs --repo JoelA510/helmets-clash-web       # exit 1
1 fail, 2 skipped, 2 pass.
$ node scripts/check-instructions.mjs --root /home/user/helmets-clash-web # exit 0
✓ Checked 18 file(s): 0 link(s), 0 import(s), 26 path(s), 0 script reference(s), and every character.
$ node scripts/check-env.mjs --root /home/user/helmets-clash-web         # exit 0
✓ Self-test passed; checked 1 variable name(s) from 0 env file(s) and source (1 read(s)).
```

*Executed*, every line.

## Findings

Ordered by how much they matter to the next run, most first. Findings about the game itself are
in the audit (`dev-documentation/audits/2026-10-production-readiness/audit.md`), not here.

### F1. `node.strict-types` fails a TypeScript 6 project that is strict, and says "strict is off"

- **Where:** the template's `scripts/check-conformance.mjs`, `'node.strict-types'` (it reads
  `c.options.strict` from `parseJsonConfigFileContent`); `standards/node/strict-types.md`;
  `prompts/existing-project.md` Phase 1 ("Each failing standard is a finding in the area the
  scorecard names").
- **What happened:** the scorecard reported `✗ fail node.strict-types (high, area 2)` with
  `tsconfig.app.json: strict is off for 55 TypeScript files` and the same for
  `tsconfig.node.json`. The target uses TypeScript 6.0.3, where an unset `strict` is on: with no
  `strict` key, `tsc -p tsconfig.app.json --noEmit` rejected a planted implicit `any` (TS7006) and a
  planted `string | null` assigned to `string` (TS2322), and the whole project has 0 errors under
  an explicit `--strict`. The check sees only an explicit option, and its test suite covers
  `strict: false` but not an unset key (`scripts/__tests__/check-conformance.test.ts:1126-1129`).
  The template itself pins `typescript` 6.0.3. *Executed.*
- **Expected:** a project whose types are strict passes "Types are strict"; at worst the check
  says strictness is implicit, not that it's off.
- **Cause:** template.
- **Impact:** worked around. Followed literally, the prompt turns this into a high finding,
  "strict is off", in the audit and an item in Milestone 4 to "raise strictness", a flagged
  refactor of a codebase that is already strict. The adversarial re-verification pass caught it
  only because a planted error behaved unexpectedly; the audit records it as corrected (2.1,
  regraded low: make the setting explicit).
- **Suggested fix:** resolve `strict` as the compiler does: when the key is unset and the
  installed (or declared) TypeScript is 6 or later, treat it as on and pass with evidence
  "strict by default (TypeScript 6+); set it explicitly"; add a test for the unset key on both
  sides of 6.0.

### F2. The scorecard scores standards whose text `process:apply` never delivered

- **Where:** the template's `scripts/apply-process.mjs` (delivers `core` plus `--pack` only) and
  its "Next steps" output; `scripts/check-conformance.mjs` (detects packs from markers);
  `prompts/existing-project.md` Phase 1 (cite each failing standard by ID).
- **What happened:** `process:apply` without `--pack` delivered `prompts/standards/core/` only.
  `check:conformance` then detected `node` and `vite-spa` and failed eight standards from them
  (`node.audit-gate`, `node.ci-runs-gate`, `node.install-guards`, `node.runtime-pinned`,
  `node.strict-types`, `node.test-suites-in-ci`, `node.unused-code`,
  `vite-spa.bundle-budget`) plus the audit-only `vite-spa.security-headers`. The audit cites all
  of them, and the target holds none of their text: a reader of the audit, or the agent that
  executes the plan, can't open `prompts/standards/node/strict-types.md` to see what "meeting it"
  means. Nothing in the next steps mentions packs. *Executed.*
- **Expected:** the target carries every standard it's scored against, or the next steps say
  which packs the scorecard will detect and how to add them.
- **Cause:** template.
- **Impact:** worked around (read the standards from the template checkout); the target's audit
  cites eight standards by ID that only the template documents.
- **Suggested fix:** have `process:apply` detect packs with the scorecard's own markers and deliver
  them (recording them in the manifest), or print "the scorecard will detect node, vite-spa:
  re-run with `--pack node --pack vite-spa`".

### F3. No audit area holds a defect in what the product does, so the blocker had nowhere to go

- **Where:** `prompts/existing-project.md` Phase 1, areas 1-12; `prompts/skeletons/docs/audit.md`
  (Summary table and sections).
- **What happened:** the most serious finding of the run is functional: a game whose first seat is
  AI can't be played (End Turn stays disabled; shown through the real `App`). The severity
  definitions name "a broken core flow" as a blocker, but none of the twelve areas covers whether
  the core flows work: they cover architecture, types, auth, data, errors, tests, CI, security,
  observability, performance, accessibility and docs. The finding went under §11 "Accessibility
  and UX completeness", which it isn't really; the turn-counter defect went under §4. The prompt's
  baseline runs gates only, and the reading step says "read the codebase", not "exercise the
  product's main flows". It was found because the audit traced the AI turn loop out of curiosity.
  *Executed* (the defect); *statically reviewed* (the prompt).
- **Expected:** an area (or a baseline step) for "the product's core flows, as the README and
  spec describe them, exercised end to end", where a broken core flow is recorded.
- **Cause:** template.
- **Impact:** worked around (filed under §11 with a note). A run that reads only for the twelve
  areas can miss a broken core flow while every gate is green, which is exactly this repository's
  state: 223 passing tests and an unplayable configuration.
- **Suggested fix:** add an area 0 or 13, "Core flows", with the audit question "for each flow
  the README or spec promises, does it work, and which test proves it?", and a skeleton section
  for it.

### F4. The prompt's scorecard command skips `core.license` on a public repository

- **Where:** `prompts/existing-project.md` Phase 1 (`npm run check:conformance -- --root <repo>`);
  the scorecard's visibility input.
- **What happened:** run as the prompt writes it, the scorecard printed
  `? skipped core.license ... visibility unknown: set "visibility" in docs/standards/conformance.json
  or pass --visibility public|private`. The run had already read the visibility, as the prompt's
  inputs require ("read it from the host"); with `--visibility public` the standard fails, which
  is the true state (no LICENSE). *Executed.*
- **Expected:** the command in the prompt carries the visibility the run established, or the
  scorecard reads it (the GitHub remote is right there).
- **Cause:** template.
- **Impact:** worked around. A literal run records a failing standard as skipped and the audit
  has no license finding.
- **Suggested fix:** in the prompt: `npm run check:conformance -- --root <repo> --visibility
  <from the inputs>`.

### F5. The prompt never runs `check:settings`, though the scorecard hands five standards to it

- **Where:** `prompts/existing-project.md` Phase 1 (names `check:conformance`, `check:env`,
  `check:instructions`, not `check:settings`); the scorecard's `audit` lines ("a repository
  setting: scored by scripts/check-settings.mjs over the GitHub API").
- **What happened:** five standards came back `audit`, pointing at `check-settings.mjs`. The
  prompt doesn't mention it, so a literal run leaves branch protection (`core.settings-branch-protected`,
  high, area 7) to the reader. Run anyway, it needed `NODE_USE_ENV_PROXY=1` to reach the API
  from this sandbox (Node's `fetch` ignores `HTTPS_PROXY`), and with a token without admin read it
  scored 3 of 5. *Executed.*
- **Expected:** the prompt runs `check:settings -- --repo <owner/name>` beside the scorecard,
  says what to do when the token can't read admin settings, and the audit skeleton's baseline
  table has a row for it (and for `check:env` and `check:instructions`, which the prompt also
  asks for).
- **Cause:** template (the step); environment (the proxy).
- **Impact:** worked around (run by hand; three extra rows added to the baseline table).
- **Suggested fix:** one sentence in Phase 1 and three rows in the audit skeleton's baseline
  table; in the script, a hint when `fetch` fails and `HTTPS_PROXY` is set.

### F6. The skill and the prompt disagree on where the audit goes

- **Where:** `.claude/skills/complete/SKILL.md` step 4 ("copied into a dated folder,
  `docs/audits/YYYY-MM-<slug>/`"); `prompts/existing-project.md` Phase 1 ("or a dated folder
  wherever this repo already keeps its plans and audits - its convention wins").
- **What happened:** the target keeps its plans in `dev-documentation/` (its README calls it "the
  development control center"). The skill names only `docs/audits/`; the prompt says the repo's
  convention wins. Following the prompt, as the brief says to on a disagreement, the audit went to
  `dev-documentation/audits/2026-10-production-readiness/`. That folder isn't in
  `dev-documentation/README.md`'s directory map, and the plan-only constraint kept it from being
  added. *Statically reviewed.*
- **Expected:** the skill carries the prompt's convention clause.
- **Cause:** template.
- **Impact:** cosmetic here; a run following the skill alone would put the audit beside, not in,
  the repo's own documentation.
- **Suggested fix:** add "(or a dated folder where the repo already keeps its plans; its
  convention wins)" to skill step 4, and "update the folder's index if it has one" to Phase 1.

### F7. The skill still asks for the definition of complete when the repository already says it

- **Where:** `.claude/skills/complete/SKILL.md` step 1 ("if it's missing, ask for the missing
  fields in one question before starting"); `prompts/existing-project.md` Output item 5 ("Ask at
  most one question, only if a missing fact blocks a reliable audit").
- **What happened:** no definition of complete was given. The README answers it well enough to
  order a plan ("a self-contained web game ... a portfolio example ... not yet positioned as a
  finished commercial game", plus its Implemented list and backlog). The skill says to ask before
  starting; the prompt allows one question only when the audit can't be reliable without it; the
  brief said to ask none. The run derived it from the README and stated the assumption in the
  audit header. *Statically reviewed.*
- **Expected:** as the same step already does for visibility and plan ("never block"), the skill
  says to draw the definition of complete (`COMPLETE_MEANS`) from the README, product doc or spec
  first, state it as an assumption, and ask only when nothing in the repository supports one.
- **Cause:** template.
- **Impact:** worked around. Followed literally in an unattended session, the run pauses at
  step 1 for an answer.
- **Suggested fix:** skill step 1: "If it's missing, derive it from the README, product docs or
  spec and state it as an assumption; ask only if the repository gives nothing to derive it from."

### F8. The scorecard misses agent rules kept outside the standard locations

- **Where:** the template's `core.agent-rules` and `core.instructions-resolve` checks, and
  `scripts/check-instructions.mjs`'s file set.
- **What happened:** `core.agent-rules` failed with "no agent rules at the root ... no agent rules
  found anywhere". The target has agent rules: `dev-documentation/CODEX_HANDOFF.md` (operating
  rules, hard constraints, definition of done) and ten Codex prompt packets, with
  `dev-documentation/MANIFEST.md` telling Codex to start there. `check:instructions` checked only
  the 18 delivered skills, so a stale reference in those rules (`implementation-plan.md` still
  lists root prompt files removed in pull request #7) was found by grep, not by the check.
  *Executed.*
- **Expected:** the verdict (no root AGENTS.md) is right; the evidence shouldn't say "none
  anywhere" when it only looked in known places, and the prompt could tell the auditor to look for
  hand-rolled agent docs to merge.
- **Cause:** template.
- **Impact:** cosmetic for the verdict; the audit corrects the wording (12.1).
- **Suggested fix:** reword to "no agent rules in any location an agent reads by default"; in
  Phase 1 §12, "look for agent instructions kept in ordinary docs (handoff files, prompt packets)
  and plan to merge them into AGENTS.md".

### F9. The prompt doesn't say which commit the scorecard scores

- **Where:** `prompts/existing-project.md` Phase 1 ("Record the commit you audited";
  `check:conformance -- --root <repo>`); `prompts/README.md` ("commit the delivery ... before any
  prompt run").
- **What happened:** the delivery is committed before the run, so `--root <repo>` scores the
  delivery commit, not the audited one: `core.process-delivered` passes and
  `core.instructions-resolve` passes on 18 delivered skills. On `704ead8` itself the first fails
  and the second is n/a (14 fail, 3 pass, 6 n/a). The baseline gates, by contrast, ran from a clone
  of `704ead8`. *Executed.*
- **Expected:** the prompt says to score the same clean clone the gates ran in, or to record
  that the delivery's own standards pass because of the delivery.
- **Cause:** template.
- **Impact:** cosmetic; recorded in the audit's baseline row.
- **Suggested fix:** "run it against the clean clone the gates ran in (`--root <clone>`), and
  note which standards the delivery itself changes".

## Scorecard accuracy

Every standard `check:conformance` reported (template `31da102`; the target at
`f9a0c01`, the delivery commit; `--visibility public` where noted), against what is true of the
repository. *Executed* for each "true state" unless marked.

| Standard | Verdict | True state | Correct? |
| --- | --- | --- | --- |
| `core.agent-rules` | fail | No root AGENTS.md; rules exist in `dev-documentation/CODEX_HANDOFF.md` | Verdict yes; evidence "no agent rules found anywhere" wrong (F8) |
| `core.ci-on-pull-requests` | fail | No `.github/workflows/` | Yes |
| `core.dependency-updates` | fail | No `dependabot.yml`; security updates are on as a setting (PR #42) | Yes (the standard is about configured updates) |
| `core.security-policy` | fail | No SECURITY.md (private reporting is enabled) | Yes |
| `core.license` | skipped; fail with `--visibility public` | Public, no LICENSE | Skip on the prompt's command hides a failure (F4); yes with visibility |
| `node.audit-gate` | fail | No audit in any workflow | Yes |
| `node.ci-runs-gate` | fail | No workflow | Yes |
| `node.install-guards` | fail | No `.npmrc`, no `packageManager` | Yes |
| `node.runtime-pinned` | fail | No `.nvmrc`, no `engines` | Yes |
| `node.strict-types` | fail ("strict is off") | Strict on by TypeScript 6's default (planted TS7006 and TS2322 both fail `tsc`) | **No: false positive** (F1) |
| `node.test-suites-in-ci` | fail | Vitest and Playwright run nowhere automatically | Yes |
| `node.unused-code` | fail | No knip; `@axe-core/react` unused | Yes |
| `vite-spa.bundle-budget` | fail | No budget | Yes |
| `core.instructions-resolve` | pass | The 18 delivered skills resolve; the repo's own agent docs aren't in scope | Yes for its scope (F8); n/a on `704ead8` (F9) |
| `core.lf-line-endings` | pass | `git ls-files --eol`: all text `i/lf`; two files git treats as binary | Yes |
| `core.no-agent-workflows` | pass | No `.agent/workflows` | Yes |
| `core.process-delivered` | pass | True of the delivery commit, false of `704ead8` | Yes for what it scored (F9) |
| `vite-spa.client-env` | pass | The app reads no env (`check:env`: one read, `process.env.CI` in the Playwright config) | Yes |
| `core.audit-waivers` | n/a | No waivers anywhere | Yes |
| `core.dependency-cooldown` | n/a | No updater config to set a cooldown in | Yes |
| `core.workflow-caches` | n/a | No workflows | Yes |
| `core.workflows-audited` | n/a | No workflows | Yes |
| `node.ci-uses-pin` | n/a | No workflow runs Node | Yes |
| `core.error-reporting` | audit | No reporter, no logging (grep) | Audit judged: fail (9.1) |
| `core.settings-branch-protected` | audit → `check:settings` fail | No ruleset, no protection (API) | Yes |
| `core.settings-dependabot-alerts` | audit → `check:settings` skipped (token) | Security updates enabled per `security_and_analysis`; alerts unread (403) | Unverified; skip honestly labelled |
| `core.settings-private-reporting` | audit → `check:settings` pass | API: `{"enabled":true}` | Yes |
| `core.settings-secret-scanning` | audit → `check:settings` pass | API: secret scanning and push protection enabled | Yes |
| `core.settings-token-read-only` | audit → `check:settings` skipped (token) | Unread; no workflows exist, so moot today | Unverified; skip honestly labelled |
| `vite-spa.security-headers` | audit | `curl -sSI`: only HSTS among the four | Audit judged: fail (8.5) |

False positives: one, `node.strict-types` (F1). False negatives: none among the verdicts; one
standard (`core.license`) skipped on the prompt's command where it fails, and one evidence line
(`core.agent-rules`) that overstates its search. Every "pass" was checked against the tree and
holds; every n/a is a real absence.

**Verdict:** sound enough to be the audit's baseline, after one correction. 29 of 30 verdicts
match the repository; the one that doesn't would have put a false high finding into the plan if
the prompt's re-verification step hadn't been followed. The audit uses the scorecard with
`node.strict-types` recorded as corrected and `core.license` scored with `--visibility public`.

## Against the release bar

CONTRIBUTING.md §8 step 5 (template checkout, *statically reviewed*): a candidate becomes the
release when the latest trial of each kind leaves no template-caused finding open except accepted
ones with a reason, and none of the three never-acceptable kinds. Each template-caused finding:

| Finding | Never-acceptable kind? | Why |
| --- | --- | --- |
| F1 `node.strict-types` false positive | **Yes: a check that rejects what the docs call valid** | TypeScript's documented behaviour since 6.0 is strict by default, and the standard's own title, "Types are strict", is met; the check fails it and says "strict is off". A literal run also writes a wrong artifact (a false high finding and a needless refactor item) unless the re-verification pass catches it. Blocks the release until fixed. |
| F2 packs not delivered | No | Nothing lost or overwritten; the audit cites standards the target can't read, a gap in the delivery's completeness. |
| F3 no area for core-flow defects | No | The run didn't stop or write a wrong artifact; it placed a blocker under a near area. It is the finding most likely to cost a future run a missed blocker, so worth fixing before 1.0.0. |
| F4 `core.license` skipped on the prompt's command | No | A skip, clearly labelled with the missing input; it didn't pass without examining. |
| F5 `check:settings` not in the prompt | No | The scorecard says where the five go; the prompt just doesn't send the run there. |
| F6 skill vs prompt on the audit folder | No | Both locations are valid artifacts. |
| F7 skill asks for the definition of complete | No | One question is the documented interaction, and the prompt allows it; an unattended run pauses rather than fails. Borderline for unattended use. |
| F8 agent-rules evidence and scope | No | `core.instructions-resolve` examined 18 files and 26 paths, not nothing; the verdict was right. |
| F9 which commit the scorecard scores | No | Recorded either way; affects two cosmetic verdicts. |

`process:apply` lost or overwrote nothing: it wrote only new files into a target that had none of
them, and `node scripts/apply-process.mjs --target <target> --check` at the end printed
`✓ Current with this template.` with the run-log row added (the run log is the target's).
*Executed.*

**Result:** not releasable as 1.0.0 from this trial: F1 is one of the never-acceptable kinds.
F2-F9 are open template findings that need fixing or recording as accepted, with a reason, before
the release; the fixes then need a rerun of at least the steps they change (the scorecard run in
Phase 1 for F1, F2, F4, F5, F9; the skill's steps 1 and 4 for F6, F7).

## Worked well

- **Phase 0 step 6 anticipated this repository.** The prompt names "a game" as a stack none of the
  references fits, and says what to use instead; the record took minutes and borrowed nothing
  unfit. The git-only fallback gave ixartz's last commit and manifest when the API and page
  answered 403. *Executed.*
- **"Evidence needs receipts" turned suspicions into findings and refuted two.** Each suspected
  defect got a scratch test in the baseline clone before it was written down: two became the
  audit's worst findings (the AI-first softlock, the menu exit deleting the save), one became a
  medium (the turn counter), and two were refuted ("AI turns freeze a Huge map", "GameScreen has
  axe violations"). *Executed.*
- **The audit skeleton's guidance pointed at real defects.** §4's client-persisted-state note led
  to the save version and validation finding; §6's "tests that can't fail" list led straight to the
  E2E spec's `if (await …isVisible())` step and the App tests' mocked `GameScreen`; §7's "config
  keys dead after a tool upgrade" led to `environmentMatchGlobs`, proven dead by removing one
  docblock. *Executed.*
- **The baseline in a separate clone** found what the repository's own log had papered over: the
  E2E suite fails on `main` (the log says "not run" or "Fail (env)" every time). *Executed.*
- **The scorecard mapped cleanly onto the areas:** 13 failing standards, each landing in the area
  it names, with IDs the plan's test gates reuse. *Executed.*
- **The traceability rule held the plan honest:** a script over both files confirmed all 39
  finding IDs appear in the plan exactly once (as items, "resolved by", or deferred).
  *Executed.*
- **`process:apply`** delivered 72 files and the manifest into a repository with its own process
  docs without touching any of them, and `--check` confirmed the delivery current at the end.
  *Executed.*
- **`check:env` and `check:instructions`** ran from the installed template checkout against the
  target with no setup. *Executed.*

## Skipped

- **Milestone 1 execution (Phase 3):** the constraints say plan-only; the plan's status line says
  NOT STARTED.
- **Any change to the game's source, config, dependencies or CI**, and to
  `dev-documentation/README.md`'s directory map (F6): constraint.
- **Dependabot's pull request #42:** left alone, per the brief.
- **Issue activity for ixartz/Next-js-Boilerplate:** the API answered 403; recorded "not available
  (git only)".
- **Dependabot alerts and the two admin-only settings:** 403 / no admin token; `npm audit` and
  `security_and_analysis` stand in.
- **Browser timing of AI turns:** measured in Node only.
- **The template's `check:audit` against the target:** the prompt asks for the repository's own
  audit command (`npm audit`) in the baseline; the template's gate appears only as a remediation
  item.

## Final checks

### Placeholder check on every artifact produced

Files: `dev-documentation/audits/2026-10-production-readiness/{reference-verification,audit,remediation-plan}.md`,
`prompts/run-log.md` (the completed row), and this file.

```text
$ LC_ALL=C grep -nE '<the pattern in prompts/existing-project.md>' <the 5 files>
(no output; exit 1)
$ node /home/user/agent-ready-template/scripts/check-placeholders.mjs <the 5 files>
✓ No placeholders or guidance comments in 5 file(s).
```

*Executed*, on the final tree.

### Traceability

A Python check over `audit.md` and `remediation-plan.md`: every finding ID (39) appears in the
plan exactly once as `(audit finding N.N, …)`, `- N.N — resolved by …`, or under "Deferred with
reason" (8.7); the plan cites no ID the audit lacks. *Executed.*

### Delivery and instructions, re-run at the end

```text
$ node scripts/apply-process.mjs --target /home/user/helmets-clash-web --check
Delivered from 31da102ca31b; this template is at 31da102ca31b.
✓ Current with this template.
$ node scripts/check-instructions.mjs --root /home/user/helmets-clash-web
✓ Checked 18 file(s): 0 link(s), 0 import(s), 26 path(s), 0 script reference(s), and every character.
```

Exit 0 both. *Executed.*

### Gates

The target's gates were run once, in the baseline clone (table above and in the audit). This run
changed no game file, so they weren't re-run on the final tree; the only files added or changed
are the delivery, the three audit artifacts, the run-log row and this log
(`git diff --stat 704ead8..HEAD -- src tests package.json package-lock.json *.config.* index.html`
is empty). *Executed.*


## Rerun after the template fixes

Per the template's release bar (CONTRIBUTING §8 step 5), the steps the fixes changed were run
again on 2026-10-12 from agent-ready-template `24bdd30` (branch
`claude/vibrant-allen-hr7y7s-trial3-fixes`, on top of `31da102`). *Executed* unless marked.

```text
$ node scripts/check-conformance.mjs --root <target> --visibility public    # before re-applying
Packs (detected): core, node, vite-spa
Scored pack(s) whose standards this repository doesn't carry: node, vite-spa. Deliver them with
the template's process:apply -- --target <this repository> --pack node --pack vite-spa
12 fail, 6 pass, 5 n/a, 7 audit. Template 1.0.0-rc.2 (24bdd30a1aee), 2026-10-12.

$ npm run process:apply -- --target <target> --pack node --pack vite-spa   # exit 0
Standards delivered: core, node, vite-spa (prompts/standards/).

$ node scripts/check-conformance.mjs --root <target> --visibility public    # after; no pack note
12 fail, 6 pass, 5 n/a, 7 audit. Template 1.0.0-rc.2 (24bdd30a1aee), 2026-10-12.

$ GITHUB_TOKEN=... NODE_USE_ENV_PROXY=1 node scripts/check-settings.mjs --repo JoelA510/helmets-clash-web
1 fail, 2 skipped, 2 pass. 2026-10-12.
```

| Finding | Status after the fixes |
| --- | --- |
| F1 | Fixed. `node.strict-types` passes ("strict by default under TypeScript 6"); the trial's run had 13 fail, 5 pass with `--visibility public`, the rerun 12 fail, 6 pass, and that standard is the only change. |
| F2 | Fixed. The scorecard named both packs and the flags; after the re-apply the target carries `prompts/standards/node/` and `vite-spa/`, and the note is gone. |
| F4 | Fixed. The prompt's command passes `--visibility`; `core.license` fails, the true state, instead of being skipped. |
| F5 | Fixed for the process: the prompt runs `check:settings` and the audit skeleton has the three baseline rows (delivered here by the re-apply). The result matches the trial's hand run. The proxy part (`NODE_USE_ENV_PROXY=1`) is this environment's, and stays a session note. |
| F7 | Fixed in the skill's text; *statically reviewed* (the change is to wording a run reads). |
| F3, F6, F8, F9 | Open, none of a never-acceptable kind. Before 1.0.0 the bar needs each fixed or recorded as accepted with a reason. |

Against the release bar: no finding of a never-acceptable kind remains (F1 was the only one). The
remaining open template findings are F3, F6, F8, F9. Phase 3 (executing milestone 1) is still
untried: this trial was plan-only.

## Session

- **Context:** one session, not compacted, no phase restarted.
- **Longer than it should have been:**
  - The E2E baseline needed a browser download: the sandbox's Chromium (build 1194) didn't match
    Playwright 1.59.1's (1217). Installed to a scratch `PLAYWRIGHT_BROWSERS_PATH`, so nothing
    outside the scratch directory changed (environment).
  - `check:settings` first failed on the token (`gh auth token` returned a value GitHub refused)
    and then needed `NODE_USE_ENV_PROXY=1` to use the session proxy (environment, F5).
  - The scratch probes took several iterations to get right (Testing Library's auto-cleanup is
    off in this repository because Vitest `globals` is false, so two renders collided). Every
    probe lived in the baseline clone and was deleted.

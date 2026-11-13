# Remediation plan

Repo: **JoelA510/helmets-clash-web** · Plan drawn up: 2026-10-12 · Source audit: [`audit.md`](./audit.md)

**Status:** IN PROGRESS as of 2026-10-13 — Milestone 1 DONE: PR 1a (#44, M1.1-M1.4, with M2.3
and a resume fix pulled in), PR 1b (#45, M1.5-M1.6), and #48 (M1.3's reporter, verified); every
exit criterion met on 2026-10-13. Decisions 1 and 2 at their defaults (owner, 2026-10-12). The
ruleset is imported and blocks a red PR (#49); QA steps 1-3 pass on production, step 4 on the #48
preview. Next: Milestone 2.

End state: every audit area at "no blocker/high findings", E2E coverage of critical
journeys, staging deploy smoke-tested, docs current — measured against: a visitor who opens the
live site can set up any seat layout the setup screen offers, play it to a winner with mouse or
keyboard, leave mid-game and resume later without losing progress, and see a clear message
instead of a blank page when something fails; and a technical reviewer finds every claimed gate
running green on every pull request as a required check, a license, and docs that match the code.

For this app, "staging" is the Vercel preview deployment of the pull request: it is built from
the same commit with the same settings as production.

Open decisions for the owner (each item that needs one says so; the default is what this plan
does if it's left to us):

1. **All-AI games** (11.1): a spectator mode that plays itself, or blocked at setup? Default:
   blocked at setup ("at least one human seat"), recorded in `spec.md` §2.1.
2. **Error reporter** (9.1): which service, and its account. Default: Sentry's free tier, with a
   public DSN in a `VITE_` variable.
3. **License** (12.3): which one, or "all rights reserved, public for review". Default: none
   chosen by us; the item waits for the owner.

## Rules for this plan

- **Traceability.** Every audit finding ID appears exactly once below: as an item, under
  "Deferred with reason", or as "resolved by" another item when one fix closes two.
- **Severity** uses the audit's definitions. If an item is graded differently from its audit
  finding, the item says so and why.
- **Milestone size.** From Milestone 2 on, a milestone with more than about five items is two
  milestones. Milestone 1 takes every blocker however many there are, but ships them in PRs of
  about five items, so each can be rolled back on its own; a milestone that ships as one
  bundled gate at the end can't be.
- **Do not do** (out of scope for this plan, even if tempting):
  - No framework or build-tool migration (no Next.js, no game engine); Tailwind 4 only through
    item M3.2's flagged refactor, once agreed.
  - No save-format redesign: add a version field and validation, keep every existing save
    loading (the migration tests in `src/__tests__/persist.test.ts` stay and pass).
  - No change to deterministic seeded map generation, combat numbers, card effects, faction
    balance or AI strategy, beyond what M1.1 and M2.3 need to make turns advance and count.
  - No AI pacing work and no re-exposed AI speed control (a feature, on the README backlog).
  - No multiplayer, accounts, analytics or storage beyond `localStorage`.
  - No weakening or deleting of existing tests or persistence validation
    (`HARDENING_PLAN.md` §6); no lowering of a gate to get green.
  - No player names or other personal data sent to the error reporter.
  - No edits to the delivered process files (`prompts/`, `.agents/skills/`, `.claude/skills/`);
    gaps go to the template.
  - Dependabot's pull request #42 is the owner's to merge; this plan doesn't take it over.

## Item format

Every item carries all of these fields. The **test gate** is the load-bearing one. A fix
without a check that would fail if the fix regressed isn't done, it's done *for now*. The gate
has to be shown failing with the fix reverted, not assumed to.

Every item's verification label is *statically reviewed*: this run planned it and executed
nothing in the repository's source.

---

## Milestone 1 — Stop the bleeding

Every blocker, plus the floor: CI as a required check and error reporting wired. Two pull
requests: **PR 1a** (items M1.1-M1.4: the game works, fails visibly, and its E2E suite passes) and
**PR 1b** (items M1.5-M1.6: CI and the required check).

> **M1.1. A game whose first seat is AI can't be played** (audit finding 11.1, blocker)
> - **Fix approach:** extract the AI-advancement loop from `endTurnTransition` into a helper
>   that advances from a given seat through AI seats to the next human (or the end of the
>   game); call it when a game starts (in `initialState`, or a `START` step `GameScreen` runs on
>   mount) and when a resumed save's active seat is AI. Setup requires at least one human seat
>   (open decision 1; default), with the reason shown under the seats; `spec.md` §2.1 says so.
> - **Files touched:** `src/game/reducer.ts`, `src/game/state.ts`, `src/ui/NewGameScreen.tsx`,
>   `src/__tests__/turn.test.ts`, `src/__tests__/components/App.test.tsx` (or a new
>   `App.seats.test.tsx`), `tests/e2e/setup-and-start.spec.ts`, `dev-documentation/spec.md`,
>   `dev-documentation/development-log.md`.
> - **Depends on:** none (open decision 1 for the all-AI rule).
> - **Effort:** M
> - **Acceptance criteria:** with seat 1 AI and seat 2 Human, after Begin Campaign the AI has
>   played turn 1 and End Turn is enabled for the human; an all-AI setup can't start, and says why.
> - **Test gate:** an App-level test through the real `GameScreen` for each layout the setup
>   screen allows, with a leading AI seat among them; the reducer test asserting the AI seat
>   moved before the human's first turn. Shown failing with the helper call reverted (the scratch
>   test in the audit failed exactly this way).
> - **Rollback:** revert PR 1a; the game returns to today's behaviour (works with a human first).
> - **Diff class:** minimal diff (an extract-function inside `reducer.ts`, not a refactor of the
>   turn model).
> - **Verification label:** statically reviewed.

> **M1.2. A render error blanks the game with no way back** (audit finding 5.1, high)
> - **Fix approach:** an `ErrorBoundary` component around `App` and around `GameScreen` that
>   shows what went wrong in plain words, with "Back to setup" and "Discard saved game", and
>   passes the error to the reporter (M1.3).
> - **Files touched:** `src/ui/ErrorBoundary.tsx` (new), `src/main.tsx`, `src/App.tsx`,
>   `src/__tests__/components/ErrorBoundary.test.tsx` (new).
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** a resumed save that throws during render shows the recovery screen,
>   and "Discard saved game" returns to a working setup screen with no Resume.
> - **Test gate:** a component test that renders a child which throws and asserts the recovery
>   screen and the discard path; shown failing with the boundary removed from `App`.
> - **Rollback:** revert the PR; render errors blank the page again.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - In Milestone 1 although high, not blocker: the floor's "error reporting wired" needs a
>   boundary to see render errors at all.

> **M1.3. No error reporting** (audit finding 9.1, high)
> - **Fix approach:** a browser error reporter (open decision 2; default Sentry's free tier)
>   initialized in `src/main.tsx` before render, fed by the boundary (M1.2) and by `window`
>   `error` and `unhandledrejection`, tagged with the build's commit and an anonymous
>   per-browser id, never a player name. Its DSN comes through a typed env module built from
>   `prompts/skeletons/docs/env-validation.md` (`src/env.ts`), with `.env.example` listing it.
>   The DSN is public by design (`VITE_` prefix); `check:env` from the template confirms no
>   secret rides with it.
> - **Files touched:** `src/main.tsx`, `src/env.ts` (new), `src/observability.ts` (new),
>   `.env.example` (new), `package.json` and `package-lock.json` (the reporter's SDK),
>   `src/__tests__/env.test.ts` (new), `README.md` (setup).
> - **Depends on:** M1.2; open decision 2; the owner creates the account and sets the DSN in
>   Vercel's environment variables.
> - **Effort:** M
> - **Acceptance criteria:** an error induced on the preview deployment (a debug-only query
>   parameter that throws) appears in the reporter within a minute, with the commit and no
>   personal data; a missing or placeholder DSN fails `npm run build`.
> - **Test gate:** `env.test.ts` asserting the build-time validation rejects a missing and a
>   placeholder DSN, shown failing with the check removed; the induced-error check recorded in
>   the PR.
> - **Rollback:** unset the DSN in Vercel (the reporter becomes a no-op) or revert the PR.
> - **Diff class:** minimal diff (adds files; no existing behaviour changes).
> - **Verification label:** statically reviewed.

> **M1.4. The E2E suite fails on `main`** (audit finding 6.1, high)
> - **Fix approach:** in both Playwright tests, after Begin Campaign wait for the tutorial
>   dialog and close it (or seed `helmets-clash:prefs:v1` with `tutorial: 'seen'` through
>   `page.addInitScript`), with no `isVisible()` conditionals; let `playwright.config.ts` use a
>   browser the environment provides when `PLAYWRIGHT_CHROMIUM_EXECUTABLE` is set.
> - **Files touched:** `tests/e2e/setup-and-start.spec.ts`, `playwright.config.ts`,
>   `tests/e2e/README.md`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** `npm run test:e2e` passes both tests on a clean checkout after
>   `npm run test:e2e:install`.
> - **Test gate:** the suite itself, run in CI by M1.5; shown failing with the old conditional
>   dismissal restored (the baseline failure).
> - **Rollback:** revert the PR.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - In Milestone 1 although high: the milestone ends with all tests green, and CI (M1.5) runs
>   this suite.

> **M1.5. No CI on pull requests** (audit finding 7.1, high)
> - **Fix approach:** `.github/workflows/ci.yml` on `pull_request` and `push` to `main`, with
>   read-only `permissions`, two jobs: "Typecheck, lint, test, build" (`npm ci`, `npm run lint`,
>   a new `npm run typecheck` = `tsc -b --noEmit`, `npm run test`, `npm run build`) and
>   "End-to-end" (`npx playwright install --with-deps chromium`, `npm run test:e2e`), Node from a
>   new `.nvmrc` (24, the Active LTS) that a new `engines.node` in `package.json` matches; the
>   README's prerequisites name it.
> - **Files touched:** `.github/workflows/ci.yml` (new), `.nvmrc` (new), `package.json`
>   (`typecheck` script, `engines`), `README.md`.
> - **Depends on:** M1.4 (so the E2E job starts green).
> - **Effort:** S
> - **Acceptance criteria:** a pull request shows both checks; each fails the PR on a failure.
> - **Test gate:** the scorecard passes `core.ci-on-pull-requests`, `node.ci-runs-gate`,
>   `node.test-suites-in-ci`, `node.runtime-pinned` and `node.ci-uses-pin`; a throwaway PR with a
>   planted type error and one with a failing test each go red, recorded in PR 1b.
> - **Rollback:** delete the workflow file.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - Also closes: 6.2 (`node.test-suites-in-ci`) and 7.3 (`node.runtime-pinned`), listed below.

> **M1.6. Nothing requires CI before a merge** (audit finding 7.2, high)
> - **Fix approach:** copy `prompts/skeletons/.github/rulesets/main.json` to
>   `.github/rulesets/main.json` with the two job names from M1.5 as required checks; the owner
>   imports it in Settings → Rules → Rulesets (a settings item: the repository is public, so
>   GitHub Free allows it). Until it's imported, "merge only when CI is green" is an operating
>   rule in AGENTS.md (M5.1).
> - **Files touched:** `.github/rulesets/main.json` (new).
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** GitHub refuses to merge a PR whose CI is red.
> - **Test gate:** `check:settings` passes `core.settings-branch-protected`; a red throwaway PR
>   shows the merge button blocked.
> - **Rollback:** disable the ruleset in Settings.
> - **Diff class:** minimal diff (one file plus a setting).
> - **Verification label:** statically reviewed.

- 6.2 — resolved by M1.5.
- 7.3 — resolved by M1.5.

**Milestone exit:** [x] CI is a required check and blocks merge on the gate (M1.5, M1.6) ·
[x] error reporting receives an induced error (M1.3) · [x] zero open blockers (M1.1) ·
[x] deployed and smoke-tested (the manual QA script, steps 1-4, on production)

---

## Milestone 2 — Data integrity

> **M2.1. Exit to main menu deletes the in-progress save** (audit finding 4.1, high)
> - **Fix approach:** `App.handleExit('menu')` keeps the save and sets it as the resumable
>   state; only Replay, a finished game and Discard clear it.
> - **Files touched:** `src/App.tsx`, `src/__tests__/components/App.test.tsx` (a test through
>   the real `GameScreen`), `tests/e2e/` (exit and resume).
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** start a game, exit to the menu: Resume is offered and restores the
>   same turn.
> - **Test gate:** the App test (start, exit, assert the save and Resume), shown failing with
>   `clearSave()` restored for the menu path; the audit's scratch test failed exactly this way.
> - **Rollback:** revert the PR.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

- 6.3 — resolved by M1.1 (every seat layout through the real `GameScreen`) and M2.1 (a menu exit
  through the real `GameScreen`).

> **M2.2. The save payload isn't versioned, and its entities aren't validated** (audit finding 4.2, medium)
> - **Fix approach:** write `version: 2` into new saves; treat a save with no version as
>   version 1 and run today's migration on it; validate each unit, city, faction and config field
>   the game reads (types and ranges), returning `null` with a reason for a save it can't read,
>   and show that reason on the setup screen instead of a silent missing Resume.
> - **Files touched:** `src/game/persist.ts`, `src/__tests__/persist.test.ts`, `src/App.tsx`,
>   `src/ui/NewGameScreen.tsx`, `dev-documentation/spec.md` §2.4.
> - **Depends on:** M1.2 (the boundary covers what validation misses).
> - **Effort:** M
> - **Acceptance criteria:** every save the existing tests load still loads; a save with a unit
>   missing `q` is rejected with a visible message, not rendered.
> - **Test gate:** persist tests for a malformed unit, city and config field, each shown failing
>   with its validator line removed; every existing migration test unchanged and passing.
> - **Rollback:** revert the PR; version-2 saves stay readable by the old code, which ignores the
>   field.
> - **Diff class:** minimal diff (extends `migrateLoadedGameState`'s existing contract).
> - **Verification label:** statically reviewed.

> **M2.3. The turn counter can advance twice per rotation** (audit finding 4.3, medium)
> - **Fix approach:** in the AI-advancement helper from M1.1, add a turn when the step wraps
>   (the next living seat's index is at or below the previous step's seat), not when it is at or
>   below the seat that ended the turn.
> - **Files touched:** `src/game/reducer.ts`, `src/__tests__/turn.test.ts`.
> - **Depends on:** M1.1.
> - **Effort:** S
> - **Acceptance criteria:** with seats human, AI, human, AI and seat 1 eliminated, one rotation
>   adds one turn.
> - **Test gate:** that test (the audit's scratch test, committed), shown failing with the old
>   comparison restored.
> - **Rollback:** revert the PR.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M2.4. Failed saves are dropped silently** (audit finding 5.2, medium)
> - **Fix approach:** `saveGame` returns whether it saved and reports the failure to the error
>   reporter (M1.3); `GameScreen` shows a persistent "This game isn't being saved" notice while
>   saves fail, in the live region too.
> - **Files touched:** `src/game/persist.ts`, `src/ui/GameScreen.tsx`,
>   `src/__tests__/persist.test.ts`, `src/__tests__/components/GameScreen.test.tsx`.
> - **Depends on:** M1.3.
> - **Effort:** S
> - **Acceptance criteria:** with `localStorage.setItem` throwing, the notice appears and the
>   reporter gets one event.
> - **Test gate:** a component test stubbing `setItem` to throw, shown failing with the notice
>   removed.
> - **Rollback:** revert the PR.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

**Milestone exit:** [ ] no path loses a saved game without the player choosing Discard or
Replay · [ ] every save the old tests load still loads · [ ] all tests green in CI ·
[ ] deployed and smoke-tested (manual QA steps 5-7)

---

## Milestone 3 — Security

> **M3.1. No dependency audit gate** (audit finding 8.1, high)
> - **Fix approach:** the dependency-policy skeleton (`prompts/skeletons/docs/dependency-policy.md`)
>   filled in as `dev-documentation/dependency-policy.md`; an audit step in `ci.yml` that fails on
>   high and critical with dated waivers, and the same step in a weekly scheduled workflow. The
>   skeleton names the template's `check-audit.mjs` as the gate to copy.
> - **Files touched:** `.github/workflows/ci.yml`, `.github/workflows/audit.yml` (new),
>   `scripts/check-audit.mjs` (copied), its test, `dev-documentation/dependency-policy.md` (new),
>   a waiver file.
> - **Depends on:** M1.5; M3.2 first, so the gate starts green on fixed advisories rather than
>   waived ones.
> - **Effort:** M
> - **Acceptance criteria:** a PR adding a dependency with a high advisory goes red; each
>   remaining waiver has a reason, owner and expiry within 90 days.
> - **Test gate:** the scorecard passes `node.audit-gate` and `core.audit-waivers`; the gate run
>   against a saved report with a planted high advisory exits 1.
> - **Rollback:** remove the step (or the workflow).
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M3.2. 21 open advisories in dev dependencies** (audit finding 8.2, medium)
> - **Fix approach:** take the patch-level fixes inside the existing ranges (`npm update` for
>   vite, postcss, vitest, @vitest/ui and the transitive ones, lockfile reviewed); for the
>   Tailwind 3 chain (`braces`, `micromatch`, `chokidar`), either migrate to Tailwind 4 with
>   `@tailwindcss/postcss` (the change `0c2b968` backed out) or waive with an expiry. The
>   migration is a **flagged refactor**: current cost, 3 high dev-only advisories and a major
>   behind; benefit, the advisories close and the toolchain is current; risk, every utility class
>   and the build pipeline change. It's the owner's call; default: waive for 90 days, and plan
>   the migration as its own change (`prompts/plan-change.md`).
> - **Files touched:** `package-lock.json`, `package.json` (only if a range must move); for the
>   migration, also `postcss.config.js`, `tailwind.config.js`, `src/index.css`.
> - **Depends on:** none.
> - **Effort:** S (updates), L (migration)
> - **Acceptance criteria:** `npm audit` shows no high or critical advisory that isn't waived.
> - **Test gate:** the audit gate (M3.1), green on the updated lockfile and red on the old one.
> - **Rollback:** restore the previous lockfile.
> - **Diff class:** minimal diff (updates); flagged refactor (Tailwind 4).
> - **Verification label:** statically reviewed.

> **M3.3. No Dependabot version updates** (audit finding 8.3, medium)
> - **Fix approach:** `.github/dependabot.yml` for npm and github-actions, weekly, grouped, with
>   a cooldown (`core.dependency-cooldown`).
> - **Files touched:** `.github/dependabot.yml` (new).
> - **Depends on:** M1.5 (updates arrive checked).
> - **Effort:** S
> - **Acceptance criteria:** a grouped version-update PR opens within a week.
> - **Test gate:** the scorecard passes `core.dependency-updates` and `core.dependency-cooldown`.
> - **Rollback:** delete the file.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M3.4. No SECURITY.md** (audit finding 8.4, medium)
> - **Fix approach:** SECURITY.md from `prompts/skeletons/SECURITY.md`, naming GitHub's private
>   vulnerability reporting (already enabled) and what's in scope (the deployed site and this
>   repository).
> - **Files touched:** `SECURITY.md` (new).
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** the repository's Security tab shows the policy.
> - **Test gate:** the scorecard passes `core.security-policy`; the placeholder check on the file
>   prints nothing.
> - **Rollback:** delete the file.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M3.5. The site sends no security headers** (audit finding 8.5, medium)
> - **Fix approach:** a `vercel.json` with a `headers` block for every path:
>   `Content-Security-Policy-Report-Only` first (self for scripts, styles and fonts, the error
>   reporter's ingest host from M1.3), with a dated step to enforce it; `X-Content-Type-Options:
>   nosniff`; `frame-ancestors 'none'`; `Referrer-Policy: strict-origin-when-cross-origin`.
> - **Files touched:** `vercel.json` (new).
> - **Depends on:** M1.3 (its host goes in the CSP).
> - **Effort:** S
> - **Acceptance criteria:** `curl -sSI` on the preview and then production shows all four.
> - **Test gate:** the `vite-spa.security-headers` audit question answered from the deployed
>   preview in the PR; a CI step that asserts the headers in `vercel.json`, shown failing with
>   one removed.
> - **Rollback:** revert the PR (Vercel redeploys without the headers).
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M3.6. Installs take brand-new releases and exotic sub-dependencies** (audit finding 8.6, medium)
> - **Fix approach:** `.npmrc` with `min-release-age=7`, `allow-git=root`, `allow-remote=root`;
>   `packageManager` pinning npm 11.15 or later; the README notes `npm ci` (with M5.4's runbook).
> - **Files touched:** `.npmrc` (new), `package.json`.
> - **Depends on:** M1.5 (CI uses the pinned npm).
> - **Effort:** S
> - **Acceptance criteria:** `npm install` of a package version published today is refused.
> - **Test gate:** the scorecard passes `node.install-guards`.
> - **Rollback:** delete `.npmrc` and the pin.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - Six items rather than about five: M3.4 and M3.6 are one file each and ship together.

**Milestone exit:** [ ] `npm audit` clean or every advisory waived with an expiry ·
[ ] the four headers on production · [ ] all tests green in CI · [ ] deployed and smoke-tested

---

## Milestone 4 — Testing & CI depth

> **M4.1. E2E specs and tool configs escape typecheck and lint** (audit finding 2.2, medium)
> - **Fix approach:** a `tsconfig.test.json` covering `tests/e2e/**`, `vitest.config.ts` and
>   `playwright.config.ts`, referenced from `tsconfig.json`; `eslint.config.js` ignores only
>   `dist`.
> - **Files touched:** `tsconfig.test.json` (new), `tsconfig.json`, `eslint.config.js`, whatever
>   the newly checked files need to pass.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** a type error in a spec fails `npm run typecheck` and CI.
> - **Test gate:** the audit's planted error (`const broken: number = 'x'` in the spec) fails
>   `typecheck` and `lint`; shown passing both with the configs reverted.
> - **Rollback:** revert the PR.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M4.2. No coverage measured** (audit finding 6.4, low)
> - **Fix approach:** `@vitest/coverage-v8`, a `coverage` block reporting `src/game/**`, and
>   thresholds set at today's numbers minus a small margin, enforced in CI.
> - **Files touched:** `package.json`, `package-lock.json`, `vitest.config.ts`,
>   `.github/workflows/ci.yml`.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** CI prints coverage and fails below the thresholds.
> - **Test gate:** deleting one domain test file drops coverage below a threshold and fails the
>   run.
> - **Rollback:** remove the thresholds.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M4.3. `environmentMatchGlobs` is dead config** (audit finding 7.5, low)
> - **Fix approach:** delete it and its comment; keep the per-file docblocks, and say so in the
>   config.
> - **Files touched:** `vitest.config.ts`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** the config describes how component tests get jsdom.
> - **Test gate:** the 223 tests still pass; a component test without its docblock still fails
>   (as in the audit), proving the docblock is the mechanism.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M4.4. Lint allows warnings** (audit finding 7.6, low)
> - **Fix approach:** `"lint": "eslint . --max-warnings=0"`.
> - **Files touched:** `package.json`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** a warning fails `npm run lint`.
> - **Test gate:** a planted warning (a second component exported from a component file trips
>   `react-refresh/only-export-components`, a warning in this config) fails lint; passes without
>   the flag.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M4.5. Accessibility is only partly gated** (audit finding 11.2, medium)
> - **Fix approach:** `@axe-core/playwright` in the E2E suite on the setup screen and in game,
>   in the default and high-contrast themes, WCAG 2.2 A and AA; the incomplete contrast nodes
>   checked by hand and fixed, or listed with their measured ratio.
> - **Files touched:** `tests/e2e/a11y.spec.ts` (new), `package.json`, `package-lock.json`,
>   `dev-documentation/test-plan.md`.
> - **Depends on:** M1.4, M1.5.
> - **Effort:** M
> - **Acceptance criteria:** CI runs axe in a real browser on both screens and both themes.
> - **Test gate:** a planted low-contrast class on the End Turn button fails the spec.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

**Milestone exit:** [ ] every test file and config typechecked and linted · [ ] coverage
reported with thresholds · [ ] axe in a real browser in CI · [ ] all tests green · [ ] deployed
and smoke-tested

---

## Milestone 5 — Completeness vs. the definition of complete

> **M5.1. No AGENTS.md; agent rules sit in a Codex handoff file** (audit finding 12.1, high)
> - **Fix approach:** AGENTS.md at the root, merged from `prompts/skeletons/AGENTS.skeleton.md`
>   and `dev-documentation/CODEX_HANDOFF.md`'s operating rules, hard constraints and definition
>   of done, naming this repository's real commands and paths; CLAUDE.md from its skeleton with
>   `@AGENTS.md`; `CODEX_HANDOFF.md` reduced to a pointer. Until M1.6's ruleset is imported, it
>   carries "merge only when CI is green".
> - **Files touched:** `AGENTS.md` (new), `CLAUDE.md` (new), `dev-documentation/CODEX_HANDOFF.md`,
>   `dev-documentation/MANIFEST.md`.
> - **Depends on:** M1.5 (the commands it names exist).
> - **Effort:** S
> - **Acceptance criteria:** a fresh Claude Code or Codex session reads the rules without being
>   told where they are.
> - **Test gate:** the scorecard passes `core.agent-rules` and `core.instructions-resolve`;
>   `check:instructions` fails on a planted path that doesn't exist.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - In this milestone although high: the ordering puts it with completeness (a reviewer reading
>   the repository); nothing a player sees depends on it.

> **M5.2. The docs-update rule isn't enforced** (audit finding 12.2, medium)
> - **Fix approach:** a pull request template with the rule as a checkbox, and a CI step that
>   fails a change under `src/game/` or `src/ui/` with no change under `dev-documentation/`
>   unless the PR carries a `no-docs` label; backfill the development-log entry and `spec.md`
>   section for pull request #41's AI card play.
> - **Files touched:** `.github/pull_request_template.md` (new), `.github/workflows/ci.yml`,
>   `dev-documentation/development-log.md`, `dev-documentation/spec.md`.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** a code-only PR goes red until docs change or it's labelled.
> - **Test gate:** a throwaway PR touching `src/game/turn.ts` alone fails the step.
> - **Rollback:** remove the step.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M5.3. A public repository with no license** (audit finding 12.3, medium)
> - **Fix approach:** the owner chooses (open decision 3); commit the text as `LICENSE` and
>   update the README's License section.
> - **Files touched:** `LICENSE` (new), `README.md`.
> - **Depends on:** open decision 3.
> - **Effort:** S
> - **Acceptance criteria:** GitHub shows the license on the repository page.
> - **Test gate:** the scorecard (with `"visibility": "public"` in
>   `docs/standards/conformance.json`, or `--visibility public`) passes `core.license`.
> - **Rollback:** a license can't be meaningfully withdrawn for copies already taken; decide once.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M5.4. Deploy settings only in the dashboard; no runbook or rollback** (audit finding 7.4, medium)
> - **Fix approach:** the build command, output directory and framework in `vercel.json` (the
>   file M3.5 created); Vercel's Node version set to match `.nvmrc`; a release runbook from
>   `prompts/skeletons/docs/release-runbook.md` as `dev-documentation/release-runbook.md`:
>   preview checks, promotion, how to confirm production serves the merged commit, and rollback
>   by promoting the previous deployment.
> - **Files touched:** `vercel.json`, `dev-documentation/release-runbook.md` (new), `README.md`.
> - **Depends on:** M3.5, M1.5.
> - **Effort:** S
> - **Acceptance criteria:** someone new can deploy and roll back from the runbook alone.
> - **Test gate:** a rollback rehearsed on a preview and recorded in the runbook; the placeholder
>   check on the runbook prints nothing.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M5.5. Docs drift** (audit finding 12.5, low)
> - **Fix approach:** one sync pass: the README's Implemented list matches what's gated, links
>   the live site, and drops "Accessibility tooling with axe" until M4.5 lands; the stale
>   root-prompt notes in `implementation-plan.md` and `test-plan.md` removed; `CODEX_HANDOFF.md`'s
>   priority list folded into M5.1; the codex prompts' never-written outputs marked as such.
> - **Files touched:** `README.md`, `dev-documentation/implementation-plan.md`,
>   `dev-documentation/test-plan.md`, `dev-documentation/codex-prompts/*.md`,
>   `dev-documentation/README.md` (directory map, including `audits/`).
> - **Depends on:** M1.4, M4.5, M5.1.
> - **Effort:** S
> - **Acceptance criteria:** every claim in the README's Implemented list points at a passing
>   test or a gated check.
> - **Test gate:** M5.2's docs step, plus `check:instructions` once M5.1 names these files.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

**Milestone exit:** [ ] a reviewer finds AGENTS.md, a license, a runbook and docs that match
the code · [ ] all tests green · [ ] deployed and smoke-tested

---

## Milestone 6 — Polish: structure and leftovers

> **M6.1. The domain imports its resolvers from the UI layer** (audit finding 1.1, low)
> - **Fix approach:** move `src/ui/gameActions.ts` to `src/game/actions.ts` and update the
>   imports; no logic change.
> - **Files touched:** `src/ui/gameActions.ts` → `src/game/actions.ts`, its importers and tests.
> - **Depends on:** Milestones 1-2 merged (their items edit the same files).
> - **Effort:** S
> - **Acceptance criteria:** `grep -rn "from '../ui" src/game` finds nothing.
> - **Test gate:** an ESLint `no-restricted-imports` rule forbidding `src/ui` from `src/game`,
>   shown failing on today's tree.
> - **Rollback:** revert.
> - **Diff class:** flagged refactor (a file move across layers), small; agree before doing it.
> - **Verification label:** statically reviewed.

> **M6.2. Hex distance computed twice** (audit finding 1.2, low)
> - **Fix approach:** `turn.ts` calls `hexDistance`.
> - **Files touched:** `src/game/turn.ts`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** one distance function.
> - **Test gate:** the temple-heal tests in `src/__tests__/buildings.test.ts` still pass; one
>   more at exactly distance 3, shown failing with an off-by-one planted in `hexDistance`.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M6.3. The reducer trusts the caller's move** (audit finding 1.4, low)
> - **Fix approach:** `MOVE_UNIT` checks the destination and cost against `computeMoveRange`
>   and returns the unchanged state for an illegal move.
> - **Files touched:** `src/game/reducer.ts`, `src/__tests__/reducer.test.ts`.
> - **Depends on:** M6.1.
> - **Effort:** S
> - **Acceptance criteria:** an illegal move dispatched directly is ignored.
> - **Test gate:** a reducer test dispatching an out-of-range move, shown failing without the
>   check.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M6.4. Strictness is implicit** (audit finding 2.1, low)
> - **Fix approach:** `"strict": true` in `tsconfig.app.json` and `tsconfig.node.json` (and
>   `tsconfig.test.json` from M4.1).
> - **Files touched:** the three tsconfig files.
> - **Depends on:** M4.1.
> - **Effort:** S
> - **Acceptance criteria:** the configs say what the compiler already does.
> - **Test gate:** the scorecard passes `node.strict-types`; `tsc` still exits 0 (the audit
>   showed 0 errors under `--strict`).
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.
> - Graded low, not the standard's high: the audit showed strictness already on.

> **M6.5. Stale committed artifacts** (audit finding 12.4, low)
> - **Fix approach:** delete `build_error.txt`; reword the `@ts-nocheck` comment in
>   `eslint.config.js` and set `'ts-nocheck': true` (banned), since nothing uses it.
> - **Files touched:** `build_error.txt` (deleted), `eslint.config.js`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** no build log in the tree; a `@ts-nocheck` fails lint.
> - **Test gate:** a planted `// @ts-nocheck` fails `npm run lint`; passes it today.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

**Milestone exit:** [ ] `src/game/` imports nothing from `src/ui/` · [ ] all tests green ·
[ ] deployed and smoke-tested

---

## Milestone 7 — Polish: budgets and small fixes

> **M7.1. No unused-code check; an unused dependency** (audit finding 1.3, low)
> - **Fix approach:** knip with a config for the Vite entry and test files, run in CI; remove
>   `@axe-core/react` (or use it in development, if the owner wants it).
> - **Files touched:** `knip.json` (new), `package.json`, `package-lock.json`,
>   `.github/workflows/ci.yml`.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** CI fails on an unused export.
> - **Test gate:** the scorecard passes `node.unused-code`; a planted unused export fails CI.
> - **Rollback:** remove the step.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M7.2. No bundle budget** (audit finding 10.1, low)
> - **Fix approach:** a budget file with today's gzip sizes (88.59 kB JS, 4.94 kB CSS) plus
>   headroom, checked after the build in CI.
> - **Files touched:** `bundle-budget.json` (new), a check script, `.github/workflows/ci.yml`.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** a build over budget fails CI.
> - **Test gate:** the scorecard passes `vite-spa.bundle-budget`; a budget set below today's
>   size fails the step.
> - **Rollback:** remove the step.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M7.3. The skip link skips nothing** (audit finding 11.3, low)
> - **Fix approach:** point "Skip to game" at the board (or the main region) with a focusable
>   target.
> - **Files touched:** `index.html`, `src/ui/GameScreen.tsx`, `src/ui/NewGameScreen.tsx`.
> - **Depends on:** none.
> - **Effort:** S
> - **Acceptance criteria:** Tab, Enter on the skip link moves focus to the board.
> - **Test gate:** an E2E step asserting focus after activating the link, shown failing on
>   today's `#root` target.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

> **M7.4. README setup rewrites the lockfile and names no Node** (audit finding 12.6, low)
> - **Fix approach:** `npm ci` and the `.nvmrc` version in the README's Local development.
> - **Files touched:** `README.md`.
> - **Depends on:** M1.5.
> - **Effort:** S
> - **Acceptance criteria:** the README's steps reproduce the CI install.
> - **Test gate:** M5.2's docs step; a reviewer following the README from a clean clone.
> - **Rollback:** revert.
> - **Diff class:** minimal diff.
> - **Verification label:** statically reviewed.

**Milestone exit:** [ ] CI holds unused code and bundle size · [ ] all tests green ·
[ ] deployed and smoke-tested

---

## Manual QA script

Run on the pull request's Vercel preview, then on production after merge. Each step names the
item that would automate it.

1. Default setup (Human, AI), Begin Campaign, play three turns to the AI's turn and back — expect:
   the AI moves, the turn counter shows 2, then 3. (Automated by M1.1's E2E step.)
2. Seat 1 AI, seat 2 Human, Begin Campaign — expect: the AI has played, End Turn is enabled for
   the human. (M1.1.)
3. All four seats AI — expect: Begin Campaign disabled with "at least one human seat" (or, if
   open decision 1 chose a spectator mode, the game plays itself). (M1.1.)
4. On a preview deployment (not production; the trigger is off there), visit with `?sentry-test`
   (M1.3's induced error) — expect: the game loads normally, and the event in Sentry within a
   minute with environment `preview`, the commit as the release, and no user. (M1.3.)
5. Start a game, exit to the main menu — expect: Resume offered; Resume restores the same turn.
   (M2.1.)
6. In a private window with storage blocked, start a game — expect: the "isn't being saved"
   notice. (M2.4.)
7. Corrupt the save in DevTools (delete a unit's `q`), reload — expect: a message on the setup
   screen, no blank page. (M2.2.)
8. Keyboard only: set up a game, move a unit onto its city, open the city with the explicit
   action, end the turn — expect: every step reachable, focus visible. (M4.5 covers part.)
9. Switch to the high-contrast theme and check the incomplete contrast nodes axe listed
   (11.2) — expect: each at 4.5:1 or above for text. (M4.5.)
10. `curl -sSI` the site — expect: CSP (report-only), nosniff, frame-ancestors, Referrer-Policy.
    (M3.5.)

## Discovered during execution

- **2026-10-12, M1.1 → M2.3 pulled into PR 1a.** With an AI seat first, the double-counting turn
  counter (4.3) fired on every rotation, not only after an elimination: M1.1 made a medium finding
  visible in the most common new layout. Fixed in #44 (one comparison) with M2.3's test. M2.3 is
  done.
- **2026-10-12, M1.3's acceptance criterion changed.** "A missing or placeholder DSN fails `npm run
  build`" contradicted the item's own rollback (unset DSN = no-op) and would fail every CI and local
  build until the Sentry account exists. In #44: unset turns reporting off; a placeholder or
  malformed value fails the build. The induced-error check on the preview deployment still stands
  and waits on the DSN.
- **2026-10-12, M1.3 cost.** A static import of the SDK added 32 kB gzip to the main bundle (88.6 →
  120.7 kB) before the bundle budget (M7) exists. Loaded lazily, and only when a DSN is set: main
  bundle 90.95 kB, SDK chunk 30.5 kB. `@sentry/react` pinned at 11.4.0: 11.7.0 was published the
  same day.
- **2026-10-12, M1.4 found two more defects behind 6.1.** Once the tutorial no longer blocked it,
  the settings test failed on the High contrast radio (visually hidden; its label intercepts the
  click), and the new AI-first E2E test hit the unmoved-units warning. Both fixed in the spec in
  #44; neither is a product defect.
- **2026-10-12, a new finding before the milestone closed: resumed hot-seat games couldn't
  continue** (high, already on `main`, missed by the audit). P1 ends the turn, P2 confirms the pass
  prompt, reload, Resume: the viewer came back as P1 while P2 was active ("(waiting)", End Turn
  disabled, no pass prompt). Found by the independent review of the milestone's own diff; the
  same unplayable symptom as 11.1, in the code M1.1 touched, so fixed in #44 with a test. Five low
  findings from the same review fixed there too (old saves without `pendingPassSeatIdx`, a recovery
  test built on a save the real loader rejects, the DSN check's two gaps, the Sentry environment,
  docs overstating what tests prove).
- **2026-10-12, M1.3 verified (#48).** The anonymous per-browser id was dropped: Sentry sets no
  user and stores nothing in the browser (saves and settings are separate keys, unaffected). The
  induced-error trigger is `?sentry-test`, off in production, and throws outside React, so it
  shows no recovery screen. Loaded on the #48 preview in headless Chromium: ingest returned 200,
  the event arrived as HELMETS-CLASH-WEB-1 with release `fc20651c08a5`, environment `preview`, no
  user, and localStorage empty; the issue was then resolved as induced. Not done: source maps are
  not uploaded, so stack traces are minified (needs a Sentry auth token in Vercel's build; optional).
- **2026-10-13, M1.6 proven and milestone 1 closed.** The owner imported the ruleset. A throwaway
  PR with a planted failing test (#49) went red on "Typecheck, lint, test, build" while
  "End-to-end" passed; with every check complete its merge state read `blocked`, and the ruleset
  requires no approvals and the branch was current with `main`, so the red required check is what
  blocked it. Closed unmerged. QA steps 1-3 run against production
  (helmets-clash.secureyour.tech) in headless Chromium with Playwright, from a throwaway spec not
  committed: step 1 reached turn 3 with End Turn enabled each time; step 2 opened on the human
  with End Turn enabled; step 3 left Begin Campaign disabled with the "at least one human seat"
  message and no board. Step 2's first attempt timed out loading the page, before any step ran,
  and passed on the one re-run. Step 4 ran on the #48 preview (the trigger is off in production).
  `check:settings` was not run: this session's token can't read the repository's admin settings.
- **2026-10-12, M1.5 proven.** Planted type error (#46) and failing test (#47) each turned
  "Typecheck, lint, test, build" red at the expected step; recorded on #45. M1.6's merge-button
  check waits on the ruleset import.

## Deferred with reason

- 8.7 (dev toolchain a major behind on TypeScript, Vitest, ESLint, jsdom; Tailwind is M3.2's) —
  each major is its own change with its own migration notes, and M3.3's Dependabot will propose
  them one at a time; reopen if one blocks a security fix or reaches end of support.

## When this plan is done

Mark the status line DONE with the date, move what's worth keeping into a lessons file
(`prompts/skeletons/docs/lessons-learned.md` as the shape, kept in `dev-documentation/`), and
leave this plan in its dated folder as the record. A check proven here that would hold in other
repositories, such as "the first seat may be AI" as a setup property test, goes to the template
as a proposed standard.

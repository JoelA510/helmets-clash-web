# Audit

Repo: **JoelA510/helmets-clash-web** · Commit audited: `704ead863e0a7ad0900166a5554bfba29ad8b603`
(`704ead8`, `main` on 2026-10-12; the process delivery `f9a0c01` on top of it adds only
`prompts/`, `.agents/skills/` and `.claude/skills/`) · Audited: 2026-10-12 · Auditor: Claude Code
(Claude Opus 5.5), running `prompts/existing-project.md` through the `complete` skill, plan-only

Complete means: a visitor who opens the live site can set up any seat layout the setup screen
offers (two to four seats, each human, AI or empty, any faction), play it to a winner with mouse
or keyboard, leave mid-game and resume later without losing progress, and see a clear message
instead of a blank page when something fails; and a technical reviewer reading the repository
finds every gate it claims (lint, typecheck, unit and E2E tests, build, dependency audit) running
green on every pull request as a required check, a license, and docs that match the code.
*Assumption:* no definition was given; this one is drawn from the README ("a self-contained web
game ... a portfolio example ... not yet positioned as a finished commercial game", its
"Implemented" list and its backlog) and from `dev-documentation/spec.md`.

Project inputs as this run filled them (stated as assumptions where the repository didn't say):

- **Repo:** `https://github.com/JoelA510/helmets-clash-web`, checked out at
  `/home/user/helmets-clash-web`.
- **Current state:** a feature-complete prototype of a turn-based hex strategy game (setup,
  2-4 seats, four factions, procedural seeded maps, combat, cities, cards, AI seats, autosave and
  resume, replay). 223 Vitest tests pass; there is no CI, the Playwright suite fails, and nothing
  reports errors.
- **Hosting:** Vercel, static SPA. Production deploys from `main` and previews from pull requests
  through Vercel's GitHub integration (`gh api repos/JoelA510/helmets-clash-web/deployments`:
  creator `vercel[bot]`, latest Production at `704ead8`), served at
  `https://helmets-clash.secureyour.tech` (the repository's homepage). Build settings live in the
  Vercel dashboard; the repository has no `vercel.json`.
- **Constraints:** plan-only: this run is a template trial. Don't execute milestone 1, and don't
  change the game's source, config, dependencies or CI. The repository's own constraints carry
  into the plan: `dev-documentation/CODEX_HANDOFF.md` "Hard constraints" (don't weaken tests or
  accessibility, preserve deterministic seeded maps and autosave compatibility, keep changes small)
  and `HARDENING_PLAN.md` §6 "Do-not-do list". No gate here costs money or touches a shared
  environment, so none was skipped for cost.
- **Known issues:** see "Known issues going in" below. The repository has no open issues; its
  only open item is Dependabot's pull request #42 (vite 8.0.9 to 8.0.16), left alone.
- **Visibility and plan:** public (`gh api repos/JoelA510/helmets-clash-web`:
  `"visibility":"public"`). The plan couldn't be read (`gh api user` returns no `plan` field), so
  GitHub Free is assumed; a public repository can require status checks on Free.

## Severity

- **Blocker:** cannot responsibly ship: data loss, a security hole, an authorization bypass, a
  broken core flow.
- **High:** will hurt users or the team soon: an unenforced guarantee, a silent failure path, a
  missing test on logic people depend on.
- **Medium:** real debt with a schedule.
- **Low:** polish.

## Baseline (run before reading for findings)

Run in a separate clone of `704ead8` (`git clone /home/user/helmets-clash-web <scratch>/baseline`),
never in the working tree. *Executed* for every row.

| Gate | Command | Result | Notes (counts, skips, flags it needed, environment) |
| --- | --- | --- | --- |
| Install | `npm ci` | PASS | 342 packages in 12.7 s; prints `21 vulnerabilities (2 low, 6 moderate, 13 high)`. The README says `npm install`, which can rewrite the lockfile (§12, 12.6). |
| Typecheck | `npx tsc -b --noEmit` (no `typecheck` script; `npm run build` runs `tsc -b`) | PASS | Exit 0. Covers `src/` and `vite.config.ts` only: a planted type error in `tests/e2e/` or `vitest.config.ts` also exits 0 (§2, 2.2). |
| Lint | `npm run lint` (`eslint .`) | PASS | 0 problems; also 0 with `--max-warnings=0`. The script itself allows warnings (§7, 7.6); `tests/e2e` and `playwright.config.ts` are ignored (§2, 2.2). |
| Unit / integration tests | `npm run test` (`vitest run`) | PASS | 21 files, 223 passed, 0 skipped, 0 todo, 9.85 s. No coverage measured (§6, 6.4). |
| E2E tests | `npm run test:e2e` (`playwright test`) | FAIL | First run BLOCKED (environment): Playwright 1.59.1 wants `chromium_headless_shell-1217`; the sandbox ships build 1194 under `/opt/pw-browsers`. After the documented `npx playwright install chromium` (into a scratch `PLAYWRIGHT_BROWSERS_PATH`): 1 passed, 1 failed. `settings modal opens and respects theme change` times out because the tutorial dialog intercepts the click on "Open settings" (§6, 6.1). |
| Build | `npm run build` (`tsc -b && vite build`) | PASS | `dist/assets/index-*.js` 286.69 kB (gzip 88.59 kB), CSS 22.20 kB (gzip 4.94 kB), 1.01 s. Warns that Browserslist data is 6 months old. |
| Dependency audit | `npm audit` | FAIL | Exit 1: 0 critical, 13 high, 6 moderate, 2 low, all through dev dependencies; `npm audit --omit=dev`: 0. No waivers exist (§8, 8.1 and 8.2). |
| Standards conformance | `npm run check:conformance -- --root /home/user/helmets-clash-web` (template `31da102`) | FAIL | Exit 1. Packs detected: core, node, vite-spa. 12 fail, 1 skipped, 5 pass, 5 n/a, 7 audit. Skipped: `core.license` (visibility unknown); with `--visibility public` it fails, giving 13 fail. Failing: `core.agent-rules`, `core.ci-on-pull-requests`, `core.dependency-updates`, `core.security-policy`, `core.license`, `node.audit-gate`, `node.ci-runs-gate`, `node.install-guards`, `node.runtime-pinned`, `node.strict-types` (a false positive, see "Refuted or corrected"), `node.test-suites-in-ci`, `node.unused-code`, `vite-spa.bundle-budget`. On `704ead8` itself (before the delivery) `core.process-delivered` fails too and `core.instructions-resolve` is n/a. |
| Repository settings | `node scripts/check-settings.mjs --repo JoelA510/helmets-clash-web` (template checkout) | FAIL | 1 fail (`core.settings-branch-protected`), 2 pass (`core.settings-private-reporting`, `core.settings-secret-scanning`), 2 skipped (`core.settings-dependabot-alerts`, `core.settings-token-read-only`: the session's token lacks admin read). Needed `NODE_USE_ENV_PROXY=1` to reach the API from this sandbox. The REST API separately shows Dependabot security updates enabled. |
| Client env | `npm run check:env -- --root <repo>` (template checkout) | PASS | `checked 1 variable name(s) from 0 env file(s) and source (1 read(s))`: the one read is `process.env.CI` in `playwright.config.ts`. The app reads no environment variables. |
| Agent instructions | `node scripts/check-instructions.mjs --root <repo>` (template checkout) | PASS | `Checked 18 file(s): 0 link(s), 0 import(s), 26 path(s), 0 script reference(s)`: the 18 are the delivered skills. The repository's own agent rules in `dev-documentation/` are outside its file set (§12, 12.1). |

Runtime: local Node 22.22.0 and npm 10.9.4 (this sandbox); CI none; production unknown (set in
the Vercel dashboard, not in the repository). Nothing pins Node: no `.nvmrc`, no `engines`
(§7, 7.3).

## Known issues going in

- E2E never recorded passing: every `dev-documentation/development-log.md` entry says
  `npm run test:e2e` was not run or failed for lack of a browser — source:
  `dev-documentation/development-log.md` — see §6 (6.1).
- "Add CI badge after GitHub Actions is configured" and "Expand E2E coverage around setup,
  autosave/resume, movement, combat, and replay" — source: `README.md` "Current improvement
  backlog" — see §7 (7.1) and §6 (6.3).
- "Wire real AI turn pacing before reintroducing an AI speed control" and "Add AI behavior notes"
  — source: `README.md` backlog, `dev-documentation/playtest-findings.md` — see §12 (12.5); the
  pacing work itself is a feature, outside this audit.
- Performance cleanup deferred (PR 6, T-PERF-01) — source: `HARDENING_PLAN.md` — see §10.
- Root-level duplicate Codex prompts "can drift" — source: `dev-documentation/test-plan.md`,
  `dev-documentation/implementation-plan.md` — already removed (pull request #7); the docs that
  mention them are stale, see §12 (12.5).
- Both playtest findings (occupied-city access, faction locked to seat) are recorded resolved —
  source: `dev-documentation/playtest-findings.md` — re-checked only through their passing tests.
- No GitHub issues exist (`gh api 'repos/JoelA510/helmets-clash-web/issues?state=all'`: 42 items,
  all pull requests).

## Summary

| # | Area | Severity of worst finding | One-line state |
| --- | --- | --- | --- |
| 1 | Architecture & boundaries | low | One small app; domain resolvers live under `src/ui/` and the game layer imports them. |
| 2 | Type safety | medium | Strict (TypeScript 6's default), but E2E specs and tool configs are never typechecked or linted. |
| 3 | Auth & authorization | n/a | No server, accounts or shared data: hotseat play on one device. |
| 4 | Data layer | high | "Exit to main menu" deletes the in-progress save; the save payload isn't versioned or entity-validated. |
| 5 | Error handling | high | No error boundary: any render error is a blank page; failed saves are silently dropped. |
| 6 | Testing | high | 223 unit tests pass, but the E2E suite fails on `main`, and no CI runs any suite. |
| 7 | CI/CD | high | No CI at all; `main` unprotected; Node unpinned; deploy settings only in Vercel's dashboard. |
| 8 | Security | high | No audit gate (13 high dev advisories open); no security headers; no SECURITY.md or Dependabot config. |
| 9 | Observability | high | No error reporting or logging: "what failed for user X yesterday" can't be answered. |
| 10 | Performance | low | 88.59 kB gzip JS; AI turns cost milliseconds; no bundle budget. |
| 11 | Accessibility & UX completeness | blocker | A game whose first seat is AI never lets anyone play; axe finds no violations, contrast partly unverified. |
| 12 | Docs, operability & stated-rule conformance | high | No AGENTS.md (rules sit in a Codex handoff file); the docs-update rule isn't enforced; no license. |

## 1. Architecture & boundaries

- **Current state:** one Vite app. `src/game/` holds the domain (types, constants, map
  generation, combat, turn flow, reducer, AI, persistence), `src/ui/` the React screens,
  `src/hooks/` two hooks. `src/game/types.ts` is the single type source. State moves through one
  reducer (`src/game/reducer.ts`). No duplicate schemas, no dead packages.
- **Findings:**
  - **1.1** `low` *statically reviewed* — The pure state resolvers (`performMove`,
    `performPlayerAttack`, `performRecruit`, `performBuild`, the card resolvers) live in
    `src/ui/gameActions.ts`, and the domain imports them back from the UI layer:
    `src/game/reducer.ts:8-11` and `src/game/ai.ts:8` import `../ui/gameActions`. The README
    sells the domain as framework-free and centralized; the dependency points the wrong way.
  - **1.2** `low` *statically reviewed* — Hex distance is derived twice: `hexDistance` in
    `src/game/hex.ts:11` and an inline copy for the temple heal in `src/game/turn.ts:36-37`.
  - **1.3** `low` *executed* `node.unused-code` — Nothing checks for unused files, exports or
    dependencies, and one has already accumulated: `@axe-core/react` is in `devDependencies`
    (`package.json`) and imported nowhere (`grep -rn "@axe-core/react" src index.html`: no match;
    the same grep finds `axe-core` in `src/__tests__/components/a11y.test.tsx`).
  - **1.4** `low` *statically reviewed* — The reducer trusts the caller for game rules:
    `MOVE_UNIT` carries its own `moveCost` and destination (`src/game/reducer.ts:23`), and
    `performMove` (`src/ui/gameActions.ts:92-119`) applies them without checking reachability;
    legality is computed only in `GameScreen` (`computeMoveRange`, `src/ui/GameScreen.tsx:115-120`).
    Harmless while the UI is the only dispatcher; a second caller (an AI change, a replay, a
    network seat) inherits no rule enforcement.
- **Pattern that closes the gap:** move `src/ui/gameActions.ts` to `src/game/` (a file move with
  import updates, no logic change) so `src/game/` imports nothing from `src/ui/`; call
  `hexDistance` from `turn.ts`; validate a move against `computeMoveRange` inside the reducer;
  run knip in CI and drop `@axe-core/react`.

## 2. Type safety

- **Current state:** TypeScript 6.0.3 with no `strict` key in `tsconfig.app.json` or
  `tsconfig.node.json`. Under TypeScript 6 an unset `strict` is on: a planted implicit `any`
  fails with TS7006 and a planted `string | null` to `string` with TS2322 (*executed*, see the
  verification record). No `@ts-nocheck`, `@ts-ignore`, `as any` or `: any` remains in `src/`
  (grep). `noUncheckedIndexedAccess` is off (282 errors if turned on, *executed*); not a finding
  at this level, an option for later. The app reads no environment variables, so no typed env
  module is needed (`check:env`, *executed*).
- **Findings:**
  - **2.1** `low` *executed* `node.strict-types` — Strictness is implicit: neither tsconfig sets
    `strict`, so it holds only because TypeScript 6 defaults it on. A reader, a tool, or a
    TypeScript older than 6 sees a non-strict config; the conformance scorecard reports
    "strict is off for 55 TypeScript files", which is untrue (see "Refuted or corrected").
  - **2.2** `medium` *executed* — The E2E specs and the tool configs are never typechecked or
    linted. `tsconfig.app.json` includes `src` only and `tsconfig.node.json` only
    `vite.config.ts`; `eslint.config.js` ignores `tests/e2e` and `playwright.config.ts`. A planted
    `const broken: number = 'x'` in `tests/e2e/setup-and-start.spec.ts` left both `tsc -b --noEmit`
    and `eslint .` at exit 0; the same line in `vitest.config.ts` left `tsc -b` at exit 0.
- **Pattern that closes the gap:** `"strict": true` written into both configs; a
  `tsconfig.test.json` (or an `include` widening) that covers `tests/e2e/**` and
  `*.config.ts`, referenced from `tsconfig.json`, and the ESLint ignore narrowed to `dist`.

## 3. Auth & authorization

- **Current state:** doesn't apply. There is no server, account, session, database or shared
  data: the game runs in one browser, hotseat players share one device, and the only persistence
  is that browser's `localStorage` (`src/game/persist.ts`, `src/hooks/useUIPrefs.ts`). The
  pass-device modal hides one player's view from the next on the same screen; it is a UX
  courtesy, not access control, and nothing depends on it being one.
- **Findings:** none.
- **Pattern that closes the gap:** nothing to close. If networked play is ever added
  (`dev-documentation/spec.md` §4 lists it as out of scope), this section starts from zero.

## 4. Data layer

- **Current state:** one autosave slot in `localStorage` under `helmets-clash:save:v1`, written
  with a 200 ms debounce (`src/game/persist.ts:227-258`) and flushed on unmount;
  `migrateLoadedGameState` (`persist.ts:86-210`) checks the top-level shape and repairs seats and
  factions from older saves, with 396 lines of tests (`src/__tests__/persist.test.ts`). Preferences
  live under `helmets-clash:prefs:v1`. No database.
- **Findings:**
  - **4.1** `high` *executed* — "Exit to main menu" deletes the in-progress game. The toolbar
    button (`src/ui/GameScreen.tsx:456-463`) calls `onExit('menu')`, and `App.handleExit`
    (`src/App.tsx:50-63`) runs `clearSave()` for every mode, not only replay. No confirmation.
    Shown in a scratch component test through the real `App`: after Begin Campaign the save
    exists; one click on "Exit to main menu" and `localStorage.getItem('helmets-clash:save:v1')`
    is `null`, so the setup screen offers no Resume. A player who steps out to the menu expecting
    to come back loses the game.
  - **4.2** `medium` *statically reviewed* — The save payload carries no version, and its
    entities aren't validated. The key ends in `:v1`, but the JSON has no `version` field, so
    `migrateLoadedGameState` infers the format from which fields are present. It checks that
    `units`, `cities` and `log` are arrays of objects and that a few scalars are finite
    (`persist.ts:87-105`), then spreads each unit, city, faction and `config` through as-is
    (`persist.ts:139`, `persist.ts:67` and `:77`, `persist.ts:199`). A save that passes these
    checks with a malformed unit (no `q`, a string `hp`) reaches the renderer, where, with no error
    boundary (5.1), a throw is a blank page and the same save is offered again on reload.
  - **4.3** `medium` *executed* — The turn counter can advance twice per rotation. The loop in
    `endTurnTransition` (`src/game/reducer.ts:71`) adds a turn whenever the next seat's index is at
    or below the seat that ended the turn, and compares every step against that same seat. With
    seats human, AI, human, AI and seat 1 eliminated, one rotation from seat 3's End Turn added
    2 to `state.turn` (scratch test: `expected 2 to be 1`).
- **Pattern that closes the gap:** keep the save on a menu exit (clear it only when the game ends
  or the player chooses Discard or Replay), with a test through `App`; add a `version` field and
  a per-entity validator that rejects, with a message, a save it can't read, as the
  `migrateLoadedGameState` contract already does for top-level fields; count a turn when the
  rotation wraps past the lowest living seat, with a test for an eliminated seat 1.

## 5. Error handling

- **Current state:** the domain returns the unchanged state for rejected actions (the reducer's
  identity-preserving guards); `persist.ts` wraps every `localStorage` call in `try/catch`. The
  app has no error boundary, no global `error` or `unhandledrejection` handler, and no
  `console.error` outside tests (grep for `ErrorBoundary|componentDidCatch|onerror|unhandledrejection`
  and `console.` in `src/`: no match outside `src/__tests__`).
- **Findings:**
  - **5.1** `high` *statically reviewed* — A render error blanks the whole game with no way back.
    `src/main.tsx` renders `<App />` with no error boundary, and `GameScreen` itself throws when a
    state has no seats (`src/ui/GameScreen.tsx:79-85`). Any throw during render unmounts the tree;
    if a resumed save caused it (4.2), the same save is offered again on the next visit.
  - **5.2** `medium` *statically reviewed* — Failed saves are dropped silently.
    `saveGame` catches quota and serialization errors with the comment "silently drop. The user
    can still play the live session; saves just won't persist" (`src/game/persist.ts:212-220`);
    `loadGame`, `clearSave` and `hasSave` likewise return defaults on any error
    (`persist.ts:260-295`). A player in a private window or over quota keeps playing a game they
    believe is saved.
- **Pattern that closes the gap:** an error boundary around `App` (and one around
  `GameScreen`) that shows what happened, offers "Back to setup" and "Discard save", and reports
  the error (9.1); `saveGame` returns whether it saved, and the game shows a persistent "Not
  being saved" notice when it didn't.

## 6. Testing

- **Current state:** Vitest, 21 files and 223 tests, all passing (*executed*): domain tests for
  combat, cards, AI cards, turn flow, reducer, map generation, buildings, persistence and a
  reducer-driven full game (`src/__tests__/e2e.test.ts`, despite the name not a browser test),
  and jsdom component tests with Testing Library, snapshots, and axe for `NewGameScreen` and
  three modals. Playwright has one spec file with two tests (`tests/e2e/setup-and-start.spec.ts`).
  No coverage tool is installed.
- **Findings:**
  - **6.1** `high` *executed* — The E2E suite fails on `main` and has never recorded a passing
    run. `settings modal opens and respects theme change` times out: after Begin Campaign the
    tutorial dialog (`Welcome to Helmets Clash`) opens over the board and intercepts the click on
    "Open settings". The spec dismisses the tutorial with
    `if (await tutorialDismiss.isVisible())` before starting the game
    (`tests/e2e/setup-and-start.spec.ts:16-19`, `:37-38`), when the dialog isn't there yet, so the
    guard never fires and the step silently does nothing. The first test passes only because it
    never clicks past the dialog. Every development-log entry records E2E as not run or failing.
  - **6.2** `high` *executed* `node.test-suites-in-ci` — Neither installed runner runs anywhere
    automatically: Vitest and Playwright are installed, and no workflow runs either (no
    `.github/workflows/`).
  - **6.3** `high` *executed* — No test covers the paths where the two worst defects live: a
    setup whose first non-empty seat is AI, or an all-AI setup (11.1), and a mid-game exit to the
    menu (4.1). The App tests replace `GameScreen` with a mock
    (`src/__tests__/components/App.test.tsx:93-100`), so the real exit path is never exercised;
    every turn-flow test starts with a human in the first seat
    (`src/__tests__/helpers.ts:13-24`, `mkConfig`).
  - **6.4** `low` *statically reviewed* — No coverage is measured or enforced: no
    `@vitest/coverage-*` dependency, no `coverage` block in `vitest.config.ts`.
- **Pattern that closes the gap:** fix the E2E spec to wait for the tutorial dialog after
  starting (or seed `helmets-clash:prefs:v1` with `tutorial: 'seen'`), with no conditional
  steps; run Vitest and Playwright in CI (7.1); add App-level tests through the real
  `GameScreen` for every seat layout the setup screen allows and for a menu exit; add V8
  coverage with a reported baseline.

## 7. CI/CD

- **Current state:** no `.github/workflows/`. Vercel builds every push: previews for pull
  requests and production from `main` (deployments API, *executed*). The only checks GitHub
  shows on `704ead8` are Vercel's and Dependabot's (`gh api .../commits/704ead8/check-runs`).
  `main` has no branch protection and no ruleset (`gh api .../branches/main/protection`: 404 "Branch
  not protected"; `.../rulesets`: `[]`).
- **Findings:**
  - **7.1** `high` *executed* `core.ci-on-pull-requests`, `node.ci-runs-gate` — No CI runs
    typecheck, lint, tests or the build on pull requests. The gates in the baseline table run only
    when someone remembers to run them locally, which is how the E2E failure (6.1) reached `main`.
  - **7.2** `high` *executed* `core.settings-branch-protected` — Nothing stops a merge to `main`:
    no ruleset or branch protection requires a status check. The repository is public, so a
    required check is available on GitHub Free.
  - **7.3** `medium` *executed* `node.runtime-pinned` — Node is pinned nowhere: no `.nvmrc`,
    `.node-version` or `engines`. Vite 8 needs Node 20.19+ or 22.12+; the README's prerequisite is
    "Node.js"; Vercel's Node version is a dashboard setting nobody can review.
  - **7.4** `medium` *statically reviewed* — Deploy settings live only in the Vercel dashboard
    (build command, output directory, Node version, headers), and there is no deploy runbook or
    written rollback. Vercel can promote an earlier deployment, but nothing in the repository says
    so, or how to tell that the shipped site matches `main`.
  - **7.5** `low` *executed* — `environmentMatchGlobs` in `vitest.config.ts:15-17` is dead under
    Vitest 4: the jsdom environment comes from the `// @vitest-environment jsdom` docblock in each
    component test. With the docblock removed from `Dialog.test.tsx`, its 5 tests fail with
    `ReferenceError: document is not defined`; the config's comment still describes the old
    mechanism.
  - **7.6** `low` *executed* — `npm run lint` is `eslint .` with no `--max-warnings=0`, so a
    warning never fails it. There are 0 warnings today.
- **Pattern that closes the gap:** one workflow on `pull_request` and `push` to `main`:
  `npm ci`, `npm run lint`, a `typecheck` script, `npm run test`, `npm run build`, then Playwright
  with `npx playwright install --with-deps chromium`, Node from an `.nvmrc` that `engines`
  matches; the ruleset skeleton (`prompts/skeletons/.github/rulesets/main.json`) imported with
  the job names as required checks; a `vercel.json` carrying the build settings and headers;
  a release runbook (`prompts/skeletons/docs/release-runbook.md`) with the rollback step;
  `environmentMatchGlobs` deleted; `--max-warnings=0`.

## 8. Security

- **Current state:** no secrets in the code or its history (`git log -p 704ead8` grepped for key,
  token, password and private-key patterns, and for `.env`, `.pem` or `.key` file names: no match;
  the same pattern matched the word "secret" in this run's delivered prompts, so it does find
  what it looks for). The app reads no environment variables (`check:env`, *executed*). Player
  names are rendered through React, which escapes them. Runtime dependencies are four (`react`,
  `react-dom`, `scheduler`, `lucide-react`), MIT and ISC. GitHub secret scanning, push protection,
  private vulnerability reporting and Dependabot security updates are on (REST API and
  `check:settings`, *executed*).
- **Findings:**
  - **8.1** `high` *executed* `node.audit-gate` — No dependency audit runs in CI or on a
    schedule, so 21 advisories sit unnoticed in the lockfile.
  - **8.2** `medium` *executed* — `npm audit`: 13 high, 6 moderate, 2 low, all in dev
    dependencies (`--omit=dev`: 0), so the shipped bundle isn't affected, but the dev server and
    build are. Direct: `vite` (high; GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff), `postcss` (high),
    `tailwindcss` (high, through `braces`, `micromatch`, `chokidar`), `vitest` and `@vitest/ui`
    (moderate). The Tailwind chain is fixable only by moving to Tailwind 4, which commit `0c2b968`
    ("Fix build: Disable strict TS and use tailwind v3", 2026-04-21) backed out in an emergency
    and nothing restored. Dependabot's open pull request #42 (vite 8.0.16) addresses part of it.
  - **8.3** `medium` *executed* `core.dependency-updates` — No `.github/dependabot.yml`: security
    updates arrive (pull request #42), version updates don't, which is how the toolchain fell a
    major behind on TypeScript, Vitest, ESLint, jsdom and Tailwind (verification record).
  - **8.4** `medium` *executed* `core.security-policy` — No SECURITY.md. Private vulnerability
    reporting is enabled, but nothing tells a reporter it exists.
  - **8.5** `medium` *executed* `vite-spa.security-headers` — The deployed site sends no
    Content-Security-Policy, `X-Content-Type-Options`, frame policy or `Referrer-Policy`:
    `curl -sSI https://helmets-clash.secureyour.tech` returns only `strict-transport-security`
    among them, and the repository configures none.
  - **8.6** `medium` *executed* `node.install-guards` — No `.npmrc` and no `packageManager` pin:
    an `npm install` takes a release published a minute ago, and a dependency can pull a git or
    tarball-URL dependency of its own.
  - **8.7** `low` *executed* — The dev toolchain is a major behind on five tools: TypeScript 6
    (7 current), Vitest 4 (5), ESLint 9 (10), jsdom 29 (30), Tailwind 3 (4) (versions in the
    verification record).
- **Pattern that closes the gap:** the dependency-policy skeleton
  (`prompts/skeletons/docs/dependency-policy.md`) with an audit step in the CI workflow that
  fails on high and critical, the same step on a weekly schedule, and dated waivers for what can't
  be fixed without a major; `npm update` within ranges for the patch-level fixes; a grouped
  `dependabot.yml` for npm and github-actions with a cooldown; SECURITY.md from the skeleton
  naming private vulnerability reporting; a `vercel.json` `headers` block with a report-only CSP
  first; `.npmrc` with `min-release-age`, `allow-git=root`, `allow-remote=root`, and
  `packageManager` pinning npm 11.15 or later.

## 9. Observability

- **Current state:** nothing. No error reporter, no logging, no analytics; Vercel's own logs see
  only static file requests.
- **Findings:**
  - **9.1** `high` *statically reviewed* `core.error-reporting` — A player's failure leaves no
    trace anywhere: a render crash (5.1), a lost save (5.2) or a softlock (11.1) on the live site
    can't be found, by player or time, by anyone. For a client-only game, client error reporting
    is the whole of this area.
- **Pattern that closes the gap:** a browser error reporter (for example Sentry's free tier, or
  any service that takes a public DSN) initialized in `src/main.tsx` before render, fed by the
  error boundary (5.1) and `window` `error`/`unhandledrejection`, tagged with the build's commit
  and an anonymous per-browser id, never a player name; its DSN through a typed env module
  (`prompts/skeletons/docs/env-validation.md`) and `.env.example`; its ingest host allowed by
  the CSP (8.5); proven by an induced error reaching it from the deployed site.

## 10. Performance

- **Current state:** measured, *executed*: JS 286.69 kB (gzip 88.59 kB), CSS 22.20 kB (gzip
  4.94 kB) from `npm run build`. AI turns run synchronously inside the reducer; on a Huge map
  with one human and three AI seats, 20 rounds of End Turn took a median 3.0 ms and at most 10.1
  ms in Node (a scratch Vitest run, not a browser; browser timing unmeasured). `GameScreen`
  recomputes move and attack ranges on every state change (`src/ui/GameScreen.tsx:109-127`, with
  a comment accepting it); not a measured problem.
- **Findings:**
  - **10.1** `low` *executed* `vite-spa.bundle-budget` — Nothing holds the bundle to a size, so
    growth goes unnoticed until it hurts.
- **Pattern that closes the gap:** a budget file with today's gzip sizes plus headroom, checked
  in CI after the build.

## 11. Accessibility & UX completeness

- **Current state:** keyboard play is designed in (hex cursor, `role="application"` board,
  `aria-keyshortcuts`, focus trap in dialogs, a polite live region for the log, a high-contrast
  theme, reduced-motion support). axe in jsdom passes for `NewGameScreen` and three modals
  (*executed* in the baseline), and in a scratch run for `GameScreen` too (0 violations, contrast
  off). On the deployed site in real Chromium, axe (WCAG 2.0-2.2 A and AA) found 0 violations on
  the setup screen (27 rules passed) and in game (25 passed) (*executed*).
- **Findings:**
  - **11.1** `blocker` *executed* — A game whose first non-empty seat is AI can't be played. The
    setup screen allows it (`canStart` needs only two non-empty seats and distinct factions,
    `src/ui/NewGameScreen.tsx:136-138`); `initialState` makes that AI seat active
    (`src/game/state.ts:160-162`); nothing runs an AI turn except the human's End Turn
    (`src/game/reducer.ts:41-91`), and End Turn is disabled for a viewer who isn't the active seat
    (`src/ui/GameScreen.tsx:415`). Shown through the real `App` in a scratch test: seat 1 AI,
    seat 2 Human, Begin Campaign: the header reads "Turn 1 · AI Aldermere (waiting)" and End Turn
    stays disabled. With every seat AI, End Turn is enabled but does nothing: the header was
    unchanged after a click. `dev-documentation/spec.md` §2.1 allows any seat to be human, AI or
    empty; the README lists "Human, AI, and empty seat modes" as implemented.
  - **11.2** `medium` *executed* — Accessibility is gated only partly. The jsdom axe tests skip
    `GameScreen` and disable `color-contrast` (`src/__tests__/components/a11y.test.tsx:25-30`);
    Playwright runs no axe. On the live site axe left `color-contrast` incomplete (needs review)
    on 11 nodes of the setup screen and 39 in game, and `aria-prohibited-attr` incomplete on 8
    setup nodes: contrast there is unverified, not passing.
  - **11.3** `low` *statically reviewed* — The "Skip to game" link (`index.html:12`) targets
    `#root`, the element right after it that wraps the whole app, so it skips nothing.
- **Pattern that closes the gap:** start every game with the same AI advancement the End Turn
  path uses, so a leading AI seat plays before the first human (and decide, in the spec, whether
  an all-AI game is a spectator mode or blocked at setup); axe in the Playwright suite on the
  setup and game screens, in both themes; the incomplete contrast nodes checked by hand and
  fixed or recorded; the skip link pointed at the board.

## 12. Docs, operability & stated-rule conformance

- **Current state:** a full README; a `dev-documentation/` control centre (spec, roadmap,
  implementation and test plans, playtest findings, a development log, two ADRs, ten Codex
  prompt packets) that the repository's own rules keep current; `HARDENING_PLAN.md` recording a
  completed hardening pass. No AGENTS.md, CLAUDE.md, CONTRIBUTING.md, SECURITY.md, LICENSE or
  `.env.example` (none needed: no env). The delivered skills pass `check:instructions`
  (*executed*). Pull requests come from several agents (Codex, Claude, Gemini Code Review is
  quoted in the development log).
- **Findings:**
  - **12.1** `high` *executed* `core.agent-rules` — No AGENTS.md. The repository's agent rules
    live in `dev-documentation/CODEX_HANDOFF.md` (operating rules, hard constraints, definition of
    done) and reach an agent only when someone gives it `dev-documentation/MANIFEST.md`'s starting
    instruction. Claude Code, Gemini, Cursor and Copilot sessions never see them, and neither does
    `check:instructions`.
  - **12.2** `medium` *statically reviewed* — A stated rule isn't enforced.
    `dev-documentation/README.md` says "Every code change that affects gameplay, setup flow,
    selection behavior, persistence shape, tests, or public behavior must update at least one file
    in this directory." Pull request #41 (`704ead8`, 2026-05-28) added the AI card-play phase and
    changed the end-turn warning, touching no file in `dev-documentation/` (`git show --stat
    704ead8`); the development log's newest entry is 2026-05-02 and `spec.md` doesn't describe AI
    card play. Nothing checks the rule.
  - **12.3** `medium` *executed* `core.license` — A public repository with no LICENSE; the
    README says "No license declared yet", which leaves the code all rights reserved.
  - **12.4** `low` *statically reviewed* — Stale committed artifacts: `build_error.txt` is a
    Windows build log (`D:/web-HC/...`) of the Tailwind 4 PostCSS error from 2026-04-21 (commit
    `0c2b968`), and the build now passes; `eslint.config.js:23-27` still justifies allowing
    `@ts-nocheck` "for a fast prototype", and no file uses it.
  - **12.5** `low` *statically reviewed* — Docs drift. `implementation-plan.md` ("Root prompt
    duplicates: `00_README_PROMPT_INDEX.md` through `09_post_change_review_prompt.md`") and
    `test-plan.md` ("Root-level duplicate prompt files can drift") describe files removed in pull
    request #7; `CODEX_HANDOFF.md`'s "Current priority order" lists work the roadmap marks Done;
    `README.md` lists "E2E testing with Playwright" and "Accessibility tooling with axe" as
    implemented while the E2E suite fails (6.1) and `@axe-core/react` is unused (1.3); the
    README doesn't link the live site; the codex prompts name outputs that were never written
    (`docs/codex/ux-gameplay-audit.md`, `docs/playtest-checklist.md`, `docs/release-notes.md`).
  - **12.6** `low` *statically reviewed* — The README's setup says `npm install`, which can
    rewrite the lockfile, and names no Node version (with 7.3).
- **Pattern that closes the gap:** an AGENTS.md at the root merged from the AGENTS skeleton
  (`prompts/skeletons/AGENTS.skeleton.md`) and `CODEX_HANDOFF.md`'s rules, with a CLAUDE.md that
  imports it and `CODEX_HANDOFF.md` reduced to a pointer; the docs-update rule enforced by a pull
  request template checkbox and a CI step that fails a change to `src/game/` or `src/ui/` with no
  `dev-documentation/` change unless the PR is labelled; a license chosen by the owner; the stale
  artifacts deleted; one docs-sync pass.

## Conflicts

- `README.md` "Implemented: E2E testing with Playwright" vs. the suite failing on `main` —
  controls: the executed result; the README is wrong (12.5).
- `HARDENING_PLAN.md` "Completed" vs. its own merge gate "PR1-PR4: full lint/test/build" with E2E
  "optional" — controls: the plan as written; it never required E2E, which is how E2E stayed
  broken (6.1).
- `dev-documentation/spec.md` §2.1 ("A seat can be `human`, `ai`, or `empty`", any slot) vs. the
  game, which softlocks when the first seat is AI — controls: the spec, as the stated behaviour
  contract (`dev-documentation/README.md`: "Treat `spec.md` as the stable behavior contract"); the
  code is the defect (11.1).
- `dev-documentation/README.md`'s update rule vs. pull request #41 — controls: the rule; the PR
  broke it (12.2).
- The conformance scorecard's `node.strict-types` ("strict is off") vs. the compiler (strict on
  by default in TypeScript 6) — controls: the compiler, whose behaviour was executed (2.1).
- `vitest.config.ts`'s comment (component tests get jsdom "via `environmentMatchGlobs`") vs.
  Vitest 4, which ignores that key — controls: Vitest's behaviour (7.5).

## Refuted or corrected during verification

The adversarial pass re-ran each executed finding's evidence and re-read each static one's code.

- **2.1** — CORRECTED — The scorecard's `node.strict-types` failure says "strict is off for 55
  TypeScript files". Strict is on: TypeScript 6 defaults it, and planted implicit-`any` and
  null-assignment errors both fail `tsc -p tsconfig.app.json`. Regraded from the standard's high
  to low: what's left is that the setting is implicit.
- **12.1** — CORRECTED — The scorecard's `core.agent-rules` detail says "no agent rules found
  anywhere". They exist, in `dev-documentation/CODEX_HANDOFF.md`; the verdict (no root AGENTS.md)
  stands.
- **4.1** — CORRECTED — First graded blocker (data loss); regraded high: the loss follows a
  player's own click on an exit control, affects only that browser's single save, and the game
  otherwise treats saves carefully (Resume/Discard on setup).
- **11.1** — CORRECTED — First suspected only for an all-AI game. A scratch test through the real
  `App` showed it for any layout whose first non-empty seat is AI, which a human player can
  choose; graded blocker as a broken core flow.
- **10** — REFUTED — "AI turns on a Huge map freeze the UI": a median 3.0 ms per End Turn with
  three AI seats (Node; browser unmeasured).
- **11** — REFUTED — "GameScreen has axe violations": none in jsdom (contrast off) or on the
  live site in Chromium; the remaining question is the incomplete contrast checks (11.2).
- **4.3** — CORRECTED — First suspected for any AI seat before a human; that layout softlocks at
  turn 1 (11.1), so the double count is reachable only after seat 1 is eliminated, as tested.
- **8.2** — CORRECTED — First read as 13 high advisories in the product; all are in dev
  dependencies (`npm audit --omit=dev`: 0), so regraded medium.

## Coverage and limitations

- Every gate ran once, on Node 22.22.0 in a Linux sandbox; production's and Vercel's Node version
  is unknown (dashboard only), so no runtime-parity check was possible.
- E2E ran against the local dev server with a Chromium the session downloaded, after the
  sandbox's own browser didn't match Playwright 1.59.1.
- The live-site axe run and header check read `https://helmets-clash.secureyour.tech` on
  2026-10-12; which commit it serves was inferred from Vercel's latest Production deployment
  (`704ead8`), not proven.
- Gameplay rules (combat numbers, card effects, AI choices, map generation balance) were not
  audited for correctness beyond their existing tests; the turn-flow and setup paths were.
- `check:settings` couldn't read the Dependabot-alerts or workflow-token settings (no admin
  token); the REST API's `security_and_analysis` filled in Dependabot security updates only.
- Dependabot alerts couldn't be listed (403 for this session); `npm audit` stands in.
- The scratch tests that proved 4.1, 4.3, 7.5 and 11.1 lived only in the baseline clone and were
  deleted; the remediation plan turns each into a committed test.
- This audit sits in `dev-documentation/audits/`, following the repository's convention of
  keeping plans in `dev-documentation/`; `dev-documentation/README.md`'s directory map doesn't
  list it yet (plan-only run: no other file changed).

# Reference verification

Phase 0 of `prompts/existing-project.md`, run for the 2026-10 production-readiness audit of
Helmets Clash (audited commit `704ead8`). The audit and remediation plan beside this file cite
only what is recorded here.

**References verified as of 2026-10-12 (18:10 UTC).**

Staleness rule: a reference is STALE if its last commit is more than 9 months old, **or** it
targets a framework one major behind current at time of execution. Stale references may still
supply architectural ideas (boundaries, naming, test strategy) but never dependency versions,
config files, or API usage verbatim.

Helmets Clash is a client-only browser game: Vite 8, React 19, TypeScript 6, Tailwind CSS 3,
Vitest 4 and Playwright 1.59, deployed as a static site on Vercel, with game state in
`localStorage` and no backend, database, accounts or environment variables. None of the
prompt's references is built for that shape. One of them, ixartz/Next-js-Boilerplate, is kept for
a single stack-neutral purpose (the list of tooling a production web repository carries); the
rest are skipped below.

| Reference | Last commit | Framework majors | Issue activity | Status | How it will be used |
| --- | --- | --- | --- | --- | --- |
| ixartz/Next-js-Boilerplate | 2026-10-08 (`b83157a`) | next@16, react@19, typescript@7, vitest@4, @playwright/test@1, tailwindcss@4 | not available (git only) | current | Ideas only: the checklist of tooling a web repository carries (pull-request CI running lint, typecheck, unit and E2E tests and the build; a pre-commit hook; an unused-code check with knip; commit linting). No versions, config files or API usage borrowed: it is a Next.js app and this is a Vite SPA. |

Sources: the GitHub API and web page both answered 403 through this session's proxy
(`GitHub access to this repository is not enabled for this session`). Last commit and manifest
came from git alone: `git clone --depth 1 --filter=blob:none --no-checkout`, then
`git log -1 --format=%cI` and `git show HEAD:package.json`. Issue activity needs the API, so it is
not available. *Executed.*

## Yardsticks when no reference fits

The stack's own documentation and current releases, and the repository's own stated rules. Current
versions were read from the npm registry (`npm view <package> version`) and Node.js release lines
from `https://nodejs.org/dist/index.json`, on 2026-10-12. *Executed.*

| Tool | Locked in `package-lock.json` | Current release | Majors behind |
| --- | --- | --- | --- |
| vite | 8.0.9 | 8.3.4 | 0 |
| react / react-dom | 19.2.5 | 19.3.0 | 0 |
| typescript | 6.0.3 | 7.0.2 | 1 |
| vitest | 4.1.5 | 5.0.4 | 1 |
| @playwright/test | 1.59.1 | 1.64.0 | 0 |
| tailwindcss | 3.4.15 | 4.3.3 | 1 |
| eslint | 9.39.4 | 10.12.0 | 1 |
| jsdom | 29.0.2 | 30.1.2 | 1 |
| Node.js | none pinned | 24.21.0 (Active LTS "Krypton"); 22.23.3 (Maintenance LTS "Jod"); 26.11.1 (Current) | n/a |

- **TypeScript 6.0:** an unset `strict` means strict. Shown here, not read: with no `strict` key
  in `tsconfig.app.json`, `tsc -p tsconfig.app.json --noEmit` rejects a planted implicit `any`
  (TS7006) and a planted `string | null` assigned to `string` (TS2322). *Executed.*
- **Vitest 4:** the `environmentMatchGlobs` option is no longer read; per-file
  `// @vitest-environment jsdom` docblocks are what select jsdom. Shown here: with the docblock
  removed from `src/__tests__/components/Dialog.test.tsx`, all 5 of its tests fail with
  `ReferenceError: document is not defined`. *Executed.*
- **Tailwind CSS 4** moved its PostCSS plugin to `@tailwindcss/postcss`; that is the error in the
  committed `build_error.txt`, and why commit `0c2b968` pinned Tailwind 3. *Statically reviewed.*
- **Vercel** sets response headers from `vercel.json` (`headers`) in the repository; the
  deployed site at `https://helmets-clash.secureyour.tech` returns only
  `strict-transport-security` among security headers (`curl -sSI`). *Executed.*
- **GitHub** allows rulesets and required status checks on public repositories on every plan;
  this repository is public (`gh api repos/JoelA510/helmets-clash-web` reports
  `"visibility":"public"`). *Executed* for visibility; the plan rule is *statically reviewed*
  from the prompt's own statement, not re-read from GitHub's docs in this run.
- **The repository's own rules:** `dev-documentation/CODEX_HANDOFF.md` (operating rules, hard
  constraints, definition of done), `dev-documentation/README.md` (the update rule),
  `dev-documentation/spec.md`, `dev-documentation/test-plan.md`, the ADRs in
  `dev-documentation/decisions/`, and `HARDENING_PLAN.md` (its do-not-do list). *Statically
  reviewed.*

- Official documentation and current releases (versions above) plus the repository's own rules —
  no listed reference fits a client-only Vite + React game with no backend; the one kept above is
  used for its tooling checklist only.

## Skipped

- t3-oss/create-t3-app — no tRPC, auth, ORM or environment variables; the app reads no env.
- vercel/next-forge — a single-package app, not a monorepo.
- epicweb-dev/epic-stack — server-rendered full-stack app with a database; nothing here to
  compare its error-handling or deployment patterns against.
- obytes/react-native-template-obytes, infinitered/ignite — no mobile surface.
- fastapi/full-stack-fastapi-template, vintasoftware/nextjs-fastapi-template — no Python or API.
- ardalis/CleanArchitecture, jasontaylordev/CleanArchitecture — no .NET.
- awesome-nestjs boilerplate index — no NestJS.
- vercel/turborepo examples — no monorepo.
- gothinkster/realworld — a CRUD idiom comparison; nothing comparable in a turn-based game.

## Provisional patterns

- Tooling checklist (pre-commit hook, knip, commit linting, CI job list) — borrowed from
  ixartz/Next-js-Boilerplate (current, verified by git only; issue activity unverified); revisit
  if the remediation plan adopts any of them, by checking the tool's own docs for a Vite SPA.

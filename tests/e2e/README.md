# End-to-end tests (Playwright)

Real-browser smoke tests that complement the Vitest + jsdom suite under
`src/__tests__/`. These run against a real Chromium build so they catch
things jsdom can't: SVG layout, actual pointer events, color-contrast
issues at the pixel level, CSS transitions, etc.

## Running

One-time per machine:

```sh
npm run test:e2e:install
```

Then, from the repo root:

```sh
npm run test:e2e
```

The Playwright config auto-launches the Vite dev server on port 5173.
`reuseExistingServer` is on in non-CI mode so repeated local runs skip
the startup cost.

## CI

The Playwright workflow needs to run `npx playwright install chromium
--with-deps` in its setup step (or use the official `microsoft/playwright`
image). Tests are intentionally scoped to fast smoke paths — they
should all finish in under 30s on a cold runner.

## Scope

Only for behavior that can't be validated in jsdom. The game's
gameplay rules, reducer transitions, and component semantics are
covered by Vitest — don't duplicate those here.

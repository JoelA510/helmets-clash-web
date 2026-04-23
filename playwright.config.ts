import { defineConfig, devices } from '@playwright/test';

// Playwright config. Launches `vite` on port 5173 before the test run,
// then drives Chromium against the local dev server. Kept minimal —
// `npm run test:e2e` invokes it; expansion into CI requires running
// `npx playwright install chromium --with-deps` once per machine.
//
// NOTE: the test directory is `tests/e2e` — separate from the Vitest
// suite at `src/__tests__/**` so they don't interfere. Vitest's runner
// won't see Playwright files and vice versa.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

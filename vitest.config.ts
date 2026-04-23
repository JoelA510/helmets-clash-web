import { defineConfig } from 'vitest/config';

// Minimal vitest config. Tests live under src/**/*.test.ts and the small
// set of end-to-end-ish scenarios under src/__tests__/.
// Uses node environment (no DOM) — all tests are pure-logic against the
// game reducer/helpers, no React component rendering.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});

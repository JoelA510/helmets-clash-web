import { defineConfig } from 'vitest/config';

// Vitest config. Pure-logic tests run in node; component tests opt into
// jsdom via `environmentMatchGlobs`. Keeps pure-logic tests fast (no DOM
// import cost) while still supporting @testing-library/react + axe.
export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx',
    ],
    environment: 'node',
    globals: false,
    setupFiles: ['src/__tests__/setup.ts'],
    environmentMatchGlobs: [
      ['src/__tests__/components/**/*.test.tsx', 'jsdom'],
    ],
  },
});

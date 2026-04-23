import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'tests/e2e', 'playwright.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The codebase deliberately uses @ts-nocheck for a fast prototype
      // (see src/App.tsx history). Allow it without requiring a description.
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-nocheck': false,
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
      }],
    },
  },
])

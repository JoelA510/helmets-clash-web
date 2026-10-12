import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { parseSentryDsn } from './src/envSchema'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Fail the build on a malformed or placeholder DSN, rather than shipping a
  // reporter that silently sends nothing. Unset is allowed (reporting off).
  parseSentryDsn(loadEnv(mode, process.cwd(), 'VITE_').VITE_SENTRY_DSN)
  return {
    plugins: [react()],
    define: {
      // Tags reported errors with the deploy they came from. Vercel sets
      // VERCEL_GIT_COMMIT_SHA during its builds.
      __BUILD_COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local'),
      // production, preview or development on Vercel; the Vite mode elsewhere.
      // Vite's mode alone calls every preview deployment "production".
      __DEPLOY_ENV__: JSON.stringify(process.env.VERCEL_ENV || mode),
    },
  }
})

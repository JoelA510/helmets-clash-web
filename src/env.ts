import { parseSentryDsn } from './envSchema';

// The only module that reads import.meta.env. Each variable is read by its
// full literal name: Vite inlines exactly that one, where reading
// import.meta.env as a whole would embed every VITE_ variable in the bundle.

// Replaced at build time by vite.config.ts (`define`): the deploy's commit,
// or "local".
declare const __BUILD_COMMIT__: string;
// Replaced at build time: Vercel's environment (production, preview,
// development), or the Vite mode off Vercel.
declare const __DEPLOY_ENV__: string;

export const env = {
  sentryDsn: parseSentryDsn(import.meta.env.VITE_SENTRY_DSN),
  buildCommit: typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'local',
  deployEnv: typeof __DEPLOY_ENV__ === 'string' ? __DEPLOY_ENV__ : import.meta.env.MODE,
} as const;

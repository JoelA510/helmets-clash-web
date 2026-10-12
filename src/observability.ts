import { env } from './env';

// Client error reporting (Sentry). Off when VITE_SENTRY_DSN is unset: every
// function here is then a no-op, and the SDK is never downloaded. When set,
// the SDK loads in its own chunk after the first render starts, so it adds
// nothing to the main bundle; an error reported before it arrives is queued.
// Window `error` and `unhandledrejection` are captured from the moment it
// has loaded, by its default global-handlers integration.
//
// Nothing personal is sent, and nothing is stored in the browser for it: no
// IP address (dataCollection.userInfo off, which also stops Sentry inferring
// one), no DOM or console breadcrumbs (player and faction names are on screen
// and in the log), and no user at all. Saved games and settings are separate
// and untouched by this module.

type SentryModule = typeof import('./sentryClient');
type Report = { error: unknown; componentStack?: string | null };

// Enough to hold a render crash and its cascade; a page throwing in a loop
// before the SDK loads shouldn't grow memory without bound.
const MAX_QUEUED = 20;

let sentry: SentryModule | null = null;
let loading: Promise<void> | null = null;
const queued: Report[] = [];

const send = (S: SentryModule, { error, componentStack }: Report) => {
  S.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
};

export const initObservability = (): Promise<void> => {
  const dsn = env.sentryDsn;
  if (!dsn) return Promise.resolve();
  loading ??= import('./sentryClient')
    .then((S) => {
      S.init({
        dsn,
        release: env.buildCommit,
        environment: env.deployEnv,
        dataCollection: { userInfo: false },
        // Breadcrumbs keep navigation and network only.
        integrations: (defaults) => [
          ...defaults.filter((i) => i.name !== 'Console' && i.name !== 'Breadcrumbs'),
          S.breadcrumbsIntegration({ dom: false }),
        ],
      });
      sentry = S;
      queued.splice(0).forEach((r) => send(S, r));
    })
    .catch((err: unknown) => {
      // Blocked by an extension or offline: the game still runs, unreported.
      console.error('Error reporting could not load; errors on this page will not be reported.', err);
    });
  return loading;
};

// For errors React catches (the error boundary): React doesn't rethrow them
// to window, so the global handlers never see them.
export const reportError = (error: unknown, componentStack?: string | null): void => {
  if (sentry) send(sentry, { error, componentStack });
  else if (loading && queued.length < MAX_QUEUED) queued.push({ error, componentStack });
};

// Preview deployments only: `?sentry-test` throws an uncaught error once the
// SDK has loaded, to prove events reach Sentry from a real deploy. Never on
// production, so a shared link can't fill the project with noise.
export const isSentryTestRequest = (search: string, deployEnv: string): boolean =>
  deployEnv !== 'production' && new URLSearchParams(search).has('sentry-test');

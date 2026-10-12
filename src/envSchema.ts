// Validation for the environment variables this app reads. Pure (no
// import.meta.env) so the build (vite.config.ts) and the app (src/env.ts)
// apply the same rules: a value the build would reject never ships.

// Shapes a copied .env.example or a half-filled dashboard leaves behind.
const PLACEHOLDER = /^(your[-_ ]|<.*>$|changeme$|xxx+$|todo$|placeholder$)/i;
// Sentry's documentation example, which builds and then reports nowhere.
const DOCS_EXAMPLE = /examplePublicKey/i;

// A Sentry DSN: https://<public key>@<host>[/<path>]/<numeric project id> (a
// self-hosted Sentry may serve under a path prefix). The key is
// public by design (it only lets a client send events), which is why the
// variable carries Vite's public VITE_ prefix.
export const parseSentryDsn = (raw: string | undefined): string | null => {
  const value = raw?.trim();
  // Unset or empty turns error reporting off; local development and CI build
  // without a DSN, and unsetting it in Vercel is the reporter's rollback.
  if (!value) return null;
  if (PLACEHOLDER.test(value) || DOCS_EXAMPLE.test(value)) {
    throw new Error(`VITE_SENTRY_DSN is a placeholder ("${value}"): set the project's DSN, or leave it unset to turn error reporting off.`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_SENTRY_DSN is not a URL: expected https://<key>@<host>/<project id>.');
  }
  if (url.protocol !== 'https:' || !url.username || url.password || !/^(\/[^/]+)*\/\d+$/.test(url.pathname)) {
    throw new Error('VITE_SENTRY_DSN is not a Sentry DSN: expected https://<key>@<host>/<project id>.');
  }
  return value;
};

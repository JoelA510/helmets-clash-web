/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Sentry DSN for client error reporting; unset turns reporting off. See
  // .env.example and src/env.ts.
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

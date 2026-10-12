// The Sentry functions observability.ts uses, imported by name so the bundler
// keeps only these. observability.ts loads this module lazily; importing the
// SDK's whole namespace dynamically would ship all of it (about 150 kB gzip
// against about 30).
export { breadcrumbsIntegration, captureException, init, setUser } from '@sentry/react';

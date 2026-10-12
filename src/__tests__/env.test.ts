import { describe, expect, it } from 'vitest';
import { parseSentryDsn } from '../envSchema';

describe('parseSentryDsn', () => {
  it('turns reporting off when unset or blank', () => {
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn('')).toBeNull();
    expect(parseSentryDsn('   ')).toBeNull();
  });

  it('accepts a DSN of the shape Sentry issues', () => {
    const dsn = 'https://0123abcd@o12345.ingest.sentry.io/678';
    expect(parseSentryDsn(` ${dsn} `)).toBe(dsn);
  });

  it('accepts a self-hosted DSN served under a path prefix', () => {
    const dsn = 'https://0123abcd@sentry.example.org/sentry/42';
    expect(parseSentryDsn(dsn)).toBe(dsn);
  });

  it.each([
    'your-sentry-dsn',
    '<dsn>',
    'changeme',
    'https://<key>@<org>.ingest.sentry.io/<project id>',
    'https://examplePublicKey@o0.ingest.sentry.io/0',
  ])('rejects the placeholder %j', (value) => {
    expect(() => parseSentryDsn(value)).toThrow(/VITE_SENTRY_DSN/);
  });

  it.each([
    'not a url',
    'http://0123abcd@o12345.ingest.sentry.io/678',
    'https://o12345.ingest.sentry.io/678',
    'https://key:secret@o12345.ingest.sentry.io/678',
    'https://0123abcd@o12345.ingest.sentry.io/project',
  ])('rejects %j, which is not a Sentry DSN', (value) => {
    expect(() => parseSentryDsn(value)).toThrow(/VITE_SENTRY_DSN/);
  });
});

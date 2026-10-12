import { beforeEach, describe, expect, it, vi } from 'vitest';

const DSN = 'https://0123abcd@o12345.ingest.sentry.io/678';
const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  breadcrumbsIntegration: vi.fn((o: unknown) => ({ name: 'Breadcrumbs', o })),
}));
vi.mock('@sentry/react', () => sentry);
const envMock = vi.hoisted(() => ({ env: { sentryDsn: null as string | null, buildCommit: 'abc123', deployEnv: 'preview' } }));
vi.mock('../env', () => envMock);

const load = async () => {
  vi.resetModules();
  return import('../observability');
};

describe('observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.env.sentryDsn = null;
  });

  it('does nothing, and never loads the SDK, when no DSN is set', async () => {
    const o = await load();
    await o.initObservability();
    o.reportError(new Error('x'));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('sends an error reported before the SDK loaded once it has', async () => {
    envMock.env.sentryDsn = DSN;
    const o = await load();
    const ready = o.initObservability();
    const err = new Error('early');
    o.reportError(err, '\n    at GameScreen');
    expect(sentry.captureException).not.toHaveBeenCalled();
    await ready;
    expect(sentry.captureException).toHaveBeenCalledWith(err, { contexts: { react: { componentStack: '\n    at GameScreen' } } });
  });

  it('sends no personal data and stores nothing: no IP inference, no DOM or console breadcrumbs, no user', async () => {
    envMock.env.sentryDsn = DSN;
    const storage = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v); } } });
    const o = await load();
    await o.initObservability();
    const opts = sentry.init.mock.calls[0][0];
    expect(opts).toMatchObject({ dsn: DSN, release: 'abc123', environment: 'preview', dataCollection: { userInfo: false } });
    expect(opts).not.toHaveProperty('initialScope');
    const integrations = opts.integrations([{ name: 'Console' }, { name: 'Breadcrumbs' }, { name: 'GlobalHandlers' }]);
    expect(integrations.map((i: { name: string }) => i.name)).toEqual(['GlobalHandlers', 'Breadcrumbs']);
    expect(sentry.breadcrumbsIntegration).toHaveBeenCalledWith({ dom: false });
    expect(storage.size).toBe(0);
    vi.unstubAllGlobals();
  });

  it('honours ?sentry-test only off production', async () => {
    const o = await load();
    expect(o.isSentryTestRequest('?sentry-test', 'preview')).toBe(true);
    expect(o.isSentryTestRequest('?sentry-test=1', 'development')).toBe(true);
    expect(o.isSentryTestRequest('?sentry-test', 'production')).toBe(false);
    expect(o.isSentryTestRequest('', 'preview')).toBe(false);
  });
});

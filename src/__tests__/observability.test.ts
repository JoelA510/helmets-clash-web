import { beforeEach, describe, expect, it, vi } from 'vitest';

const DSN = 'https://0123abcd@o12345.ingest.sentry.io/678';
const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
  breadcrumbsIntegration: vi.fn((o: unknown) => ({ name: 'Breadcrumbs', o })),
}));
vi.mock('@sentry/react', () => sentry);
const envMock = vi.hoisted(() => ({ env: { sentryDsn: null as string | null, buildCommit: 'abc123', mode: 'test' } }));
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

  it('sends no personal data: no IP inference, no DOM or console breadcrumbs, an anonymous user', async () => {
    envMock.env.sentryDsn = DSN;
    const o = await load();
    await o.initObservability();
    const opts = sentry.init.mock.calls[0][0];
    expect(opts).toMatchObject({ dsn: DSN, release: 'abc123', dataCollection: { userInfo: false } });
    const integrations = opts.integrations([{ name: 'Console' }, { name: 'Breadcrumbs' }, { name: 'GlobalHandlers' }]);
    expect(integrations.map((i: { name: string }) => i.name)).toEqual(['GlobalHandlers', 'Breadcrumbs']);
    expect(sentry.breadcrumbsIntegration).toHaveBeenCalledWith({ dom: false });
    const [user] = sentry.setUser.mock.calls[0];
    expect(Object.keys(user)).toEqual(['id']);
    expect(user.id).toMatch(/^[0-9a-f-]{36}$|^anon-/);
  });
});

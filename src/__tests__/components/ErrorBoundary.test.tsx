// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import type { GameState } from '../../game/types';

const Boom = (): never => {
  throw new Error('kaboom');
};

describe('ErrorBoundary', () => {
  // React logs every caught render error to console.error; keep the run quiet.
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('replaces a throwing child with a recovery screen and both ways out', async () => {
    const user = userEvent.setup();
    const onBackToSetup = vi.fn();
    const onDiscardSave = vi.fn();
    render(
      <ErrorBoundary onBackToSetup={onBackToSetup} onDiscardSave={onDiscardSave}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/);
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard saved game' }));
    expect(onDiscardSave).toHaveBeenCalledTimes(1);
    expect(onBackToSetup).not.toHaveBeenCalled();
  });

  it('renders its children untouched when nothing throws', () => {
    render(
      <ErrorBoundary onBackToSetup={() => {}} onDiscardSave={() => {}}>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// Through the real App, setup screen and GameScreen: a saved game that throws
// while rendering (a state with no seats, which GameScreen refuses).
const save = { current: null as GameState | null };
vi.mock('../../game/persist', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../game/persist')>();
  return {
    ...real,
    hasSave: () => save.current !== null,
    loadGame: () => save.current,
    clearSave: () => { save.current = null; },
    saveGame: () => {},
  };
});

describe('App: a saved game that crashes on resume', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.clear();
    window.localStorage.setItem('helmets-clash:prefs:v1', JSON.stringify({ tutorial: 'dismissed' }));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows the recovery screen, and Discard returns to a working setup with no Resume', async () => {
    const { initialState } = await import('../../game/state');
    const { mkConfig } = await import('../helpers');
    const { default: App } = await import('../../App');
    save.current = { ...initialState(mkConfig()), seats: [] };
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^Resume/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/);

    await user.click(screen.getByRole('button', { name: 'Discard saved game' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Helmets Clash');
    expect(screen.queryByRole('button', { name: /^Resume/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeEnabled();
  });
});

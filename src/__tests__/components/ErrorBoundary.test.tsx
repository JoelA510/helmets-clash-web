// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../ui/ErrorBoundary';

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

// Through the real App, setup screen and persistence, with a real saved game.
// GameScreen is replaced by one that throws while rendering: what the
// boundary has to handle is any render error in the game, whatever causes it.
vi.mock('../../ui/GameScreen', () => ({
  GameScreen: () => {
    throw new Error('render failed');
  },
}));

describe('App: a game that throws while rendering', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.clear();
    window.localStorage.setItem('helmets-clash:prefs:v1', JSON.stringify({ tutorial: 'dismissed' }));
    const { initialState } = await import('../../game/state');
    const { saveGame } = await import('../../game/persist');
    const { mkConfig } = await import('../helpers');
    saveGame(initialState(mkConfig()));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  const resumeIntoCrash = async (user: ReturnType<typeof userEvent.setup>) => {
    const { default: App } = await import('../../App');
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Resume/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/);
  };

  it('shows the recovery screen, and Discard returns to a working setup with no Resume', async () => {
    const user = userEvent.setup();
    await resumeIntoCrash(user);
    await user.click(screen.getByRole('button', { name: 'Discard saved game' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Helmets Clash');
    expect(screen.queryByRole('button', { name: /^Resume/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeEnabled();
  });

  it('Back to setup keeps the save, so Resume is still offered', async () => {
    const user = userEvent.setup();
    await resumeIntoCrash(user);
    await user.click(screen.getByRole('button', { name: 'Back to setup' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Helmets Clash');
    expect(screen.getByRole('button', { name: /^Resume/i })).toBeInTheDocument();
  });
});

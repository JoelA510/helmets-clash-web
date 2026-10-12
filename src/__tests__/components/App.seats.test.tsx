// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

const PREFS_KEY = 'helmets-clash:prefs:v1';

// Through the real App, setup screen and GameScreen (no mocks), as a player
// would reach it: the setup's defaults are seat 1 Human, seat 2 AI.
describe('App: a game whose first seat is AI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ aiSpeed: 'instant', theme: 'default', tutorial: 'dismissed' }));
  });
  afterEach(cleanup);

  it('plays the AI first, then hands turn 1 to the human with End Turn enabled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText(/Change seat 1 kind; currently Human/i)); // human -> ai
    await user.click(screen.getByLabelText(/Change seat 2 kind; currently AI/i)); // ai -> empty
    await user.click(screen.getByLabelText(/Change seat 2 kind; currently Empty/i)); // empty -> human
    await user.click(screen.getByRole('button', { name: /Begin Campaign/i }));

    const header = await screen.findByText(/^Turn 1 · /);
    expect(header).not.toHaveTextContent('(waiting)');
    expect(screen.getByRole('button', { name: /end turn \(e\)/i })).toBeEnabled();
  });

  it("won't start a game with only AI seats, and says why", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText(/Change seat 1 kind; currently Human/i)); // human -> ai
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/at least one human seat/i);
  });
});

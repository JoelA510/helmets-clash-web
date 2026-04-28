// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialState } from '../../game/state';
import { mkConfig } from '../helpers';
import { GameScreen } from '../../ui/GameScreen';

afterEach(cleanup);

const PREFS_KEY = 'helmets-clash:prefs:v1';

describe('GameScreen city activation', () => {
  beforeEach(() => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({
      aiSpeed: 'fast',
      theme: 'default',
      tutorial: 'dismissed',
      confirmEndTurnWithActions: false,
    }));
  });

  it('exposes an Open city action when a selected friendly unit shares the city tile', async () => {
    const user = userEvent.setup();
    const state = initialState(mkConfig({
      seats: [
        { kind: 'human', name: 'P1' },
        { kind: 'human', name: 'P2' },
        { kind: 'empty', name: '' },
        { kind: 'empty', name: '' },
      ],
    }));
    const factionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === factionId)!;
    const unit = state.units.find((u) => u.faction === factionId)!;
    unit.q = city.q;
    unit.r = city.r;

    render(<GameScreen config={state.config} initialState={state} onExit={() => {}} />);

    await user.click(screen.getByRole('img', { name: /shares this tile with a city/i }));
    expect(screen.getByText('This tile has both your selected unit and your city.')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /Open city .* management/i }));
    expect(screen.getByRole('heading', { name: city.name })).not.toBeNull();
  });

  it('closes city modal when ending turn (prevents stale city carry-over)', async () => {
    const user = userEvent.setup();
    const state = initialState(mkConfig({
      seats: [
        { kind: 'human', name: 'P1' },
        { kind: 'human', name: 'P2' },
        { kind: 'empty', name: '' },
        { kind: 'empty', name: '' },
      ],
    }));
    const factionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === factionId)!;
    const unit = state.units.find((u) => u.faction === factionId)!;
    unit.q = city.q;
    unit.r = city.r;

    render(<GameScreen config={state.config} initialState={state} onExit={() => {}} />);

    await user.click(screen.getByRole('img', { name: /shares this tile with a city/i }));
    await user.click(screen.getByRole('button', { name: /Open city .* management/i }));
    expect(screen.getByRole('heading', { name: city.name })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /End Turn/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: city.name })).toBeNull();
    });
  });
});

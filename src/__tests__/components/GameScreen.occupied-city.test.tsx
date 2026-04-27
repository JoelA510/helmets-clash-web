// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameScreen } from '../../ui/GameScreen';
import { initialState } from '../../game/state';
import { mkConfig, cloneState } from '../helpers';

vi.mock('../../game/persist', () => ({
  debouncedSaveGame: vi.fn(),
  clearSave: vi.fn(),
  flushPendingSave: vi.fn(),
}));

afterEach(cleanup);

const renderGame = (state = initialState(mkConfig({ seed: 1337 }))) => {
  return render(<GameScreen config={state.config} initialState={state} onExit={() => {}} />);
};

describe('GameScreen occupied-city interaction', () => {
  it('friendly city with no unit remains accessible', () => {
    const state = cloneState(initialState(mkConfig({ seed: 501 })));
    const viewerFactionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === viewerFactionId)!;
    state.units = state.units.filter((u) => !(u.faction === viewerFactionId && u.q === city.q && u.r === city.r));

    renderGame(state);
    const board = screen.getByRole('application', { name: /hex battle map/i });
    board.focus();
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('dialog', { name: city.name })).toBeInTheDocument();
  });

  it('friendly unit with no city remains selectable', async () => {
    const user = userEvent.setup();
    const state = cloneState(initialState(mkConfig({ seed: 502 })));
    const viewerFactionId = state.seats[0].factionId;
    const viewerCities = state.cities.filter((c) => c.faction === viewerFactionId);
    const unit = state.units.find((u) =>
      u.faction === viewerFactionId && !viewerCities.some((c) => c.q === u.q && c.r === u.r)
    )!;

    renderGame(state);
    await user.click(screen.getByRole('img', { name: new RegExp(`\\b${unit.type}\\b`, 'i') }));

    expect(screen.getByText(/Has acted this turn|HP/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open city:/i })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${unit.hp}/${unit.maxHp}`))).toBeInTheDocument();
  });

  it('friendly city with friendly unit on the same tile allows city access', async () => {
    const user = userEvent.setup();
    const state = cloneState(initialState(mkConfig({ seed: 503 })));
    const viewerFactionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === viewerFactionId)!;
    const unitOnCity = state.units.find((u) => u.faction === viewerFactionId && u.q === city.q && u.r === city.r)!;

    renderGame(state);
    await user.click(screen.getByRole('img', { name: new RegExp(`\\b${unitOnCity.type}\\b`, 'i') }));

    const openCityButton = screen.getByRole('button', { name: new RegExp(`Open city: ${city.name}`) });
    expect(openCityButton).toBeInTheDocument();
    await user.click(openCityButton);

    expect(screen.getByRole('dialog', { name: city.name })).toBeInTheDocument();
    expect(unitOnCity.id).toBeGreaterThan(0);
  });
});

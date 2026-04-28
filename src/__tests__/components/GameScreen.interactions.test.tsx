// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameScreen } from '../../ui/GameScreen';
import { initialState } from '../../game/state';
import { neighbors } from '../../game/hex';
import { TERRAIN, UNIT_TYPES } from '../../game/constants';
import { mkConfig } from '../helpers';
import { cloneGameState } from '../../game/clone';

const PREFS_KEY = 'helmets-clash:prefs:v1';

const seedState = (seed: number) => initialState(mkConfig({ seed }));

const renderGame = (state = seedState(9001)) =>
  render(<GameScreen config={state.config} initialState={state} onExit={() => {}} />);

const dismissTutorialPrefs = () => {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify({
    aiSpeed: 'fast',
    theme: 'default',
    tutorial: 'dismissed',
    confirmEndTurnWithActions: false,
  }));
};

describe('GameScreen city/unit interactions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dismissTutorialPrefs();
  });

  afterEach(cleanup);

  it('friendly city with no occupying unit remains keyboard-accessible', () => {
    const state = cloneGameState(seedState(9101));
    const viewerFactionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === viewerFactionId)!;

    state.units = state.units.filter((u) => !(u.faction === viewerFactionId && u.q === city.q && u.r === city.r));

    renderGame(state);

    const board = screen.getByRole('application', { name: /hex battle map/i });
    board.focus();
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: city.name })).toBeInTheDocument();
  });

  it('friendly unit selection still works when activating a tile with no city', () => {
    const state = cloneGameState(seedState(9102));
    const viewerFactionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === viewerFactionId)!;
    const unit = state.units.find((u) => u.faction === viewerFactionId)!;

    if (unit.q === city.q && unit.r === city.r) {
      const openNeighbor = neighbors(city.q, city.r).find((n) => {
        const tile = state.map[`${n.q},${n.r}`];
        const hasTile = !!tile;
        const passable = !!tile && TERRAIN[tile.type].passable;
        const occupied = state.units.some((u) => u.q === n.q && u.r === n.r);
        const cityHere = state.cities.some((c) => c.q === n.q && c.r === n.r);
        return hasTile && passable && !occupied && !cityHere;
      });
      expect(openNeighbor).toBeDefined();
      unit.q = openNeighbor!.q;
      unit.r = openNeighbor!.r;
    }

    renderGame(state);

    fireEvent.click(screen.getByRole('img', {
      name: new RegExp(`${state.factions[viewerFactionId].displayName} ${UNIT_TYPES[unit.type].name}, health`, 'i'),
    }));

    expect(screen.getByText(UNIT_TYPES[unit.type].name)).toBeInTheDocument();
  });

  it('friendly city + unit on the same tile allows both unit selection and city access via Enter/Space', () => {
    const state = cloneGameState(seedState(9103));
    const viewerFactionId = state.seats[0].factionId;
    const city = state.cities.find((c) => c.faction === viewerFactionId)!;
    const unit = state.units.find((u) => u.faction === viewerFactionId)!;
    unit.q = city.q;
    unit.r = city.r;

    renderGame(state);

    fireEvent.click(screen.getByRole('img', {
      name: new RegExp(`${state.factions[viewerFactionId].displayName} ${UNIT_TYPES[unit.type].name}, health`, 'i'),
    }));
    expect(screen.getByText(UNIT_TYPES[unit.type].name)).toBeInTheDocument();

    const board = screen.getByRole('application', { name: /hex battle map/i });
    board.focus();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('heading', { name: city.name })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    board.focus();
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('heading', { name: city.name })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameScreen } from '../../ui/GameScreen';
import { initialState } from '../../game/state';
import { hexKey, neighbors } from '../../game/hex';
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

const makeEnemyUnitCityStackState = (seed: number) => {
  const state = cloneGameState(seedState(seed));
  const viewerFactionId = state.seats[0].factionId;
  const enemyFactionId = state.seats[1].factionId;
  const attacker = state.units.find((u) => u.faction === viewerFactionId)!;
  const enemyUnit = state.units.find((u) => u.faction === enemyFactionId)!;
  const enemyCity = state.cities.find((c) => c.faction === enemyFactionId)!;
  const viewerCity = state.cities.find((c) => c.faction === viewerFactionId)!;

  state.units.forEach((unit) => {
    const isTestUnit = unit.id === attacker.id || unit.id === enemyUnit.id;
    const isTestHex = (unit.q === 0 && unit.r === 0) || (unit.q === 1 && unit.r === 0);
    if (!isTestUnit && isTestHex) {
      unit.q = 99;
      unit.r = 99;
    }
  });
  state.cities.forEach((city) => {
    const isTestCity = city.id === viewerCity.id || city.id === enemyCity.id;
    const isTestHex = (city.q === 0 && city.r === 0) || (city.q === 1 && city.r === 0);
    if (!isTestCity && isTestHex) {
      city.q = 99;
      city.r = 99;
    }
  });

  attacker.q = 0;
  attacker.r = 0;
  attacker.acted = false;
  enemyUnit.q = 1;
  enemyUnit.r = 0;
  enemyCity.q = 1;
  enemyCity.r = 0;
  enemyCity.hp = enemyCity.maxHp;
  viewerCity.q = 0;
  viewerCity.r = 0;

  state.map[hexKey(0, 0)] = { q: 0, r: 0, type: 'grass' };
  state.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'grass' };
  state.factions[viewerFactionId].explored.add(hexKey(0, 0));
  state.factions[viewerFactionId].explored.add(hexKey(1, 0));

  return { state, viewerFactionId, attacker, enemyUnit, enemyCity };
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

  it('clicking an enemy unit stacked on an enemy city attacks the unit first', () => {
    const { state, viewerFactionId, attacker, enemyUnit, enemyCity } = makeEnemyUnitCityStackState(9201);
    const enemyUnitDef = UNIT_TYPES[enemyUnit.type];

    renderGame(state);

    fireEvent.click(screen.getByRole('img', {
      name: new RegExp(`${state.factions[viewerFactionId].displayName} ${UNIT_TYPES[attacker.type].name}, health`, 'i'),
    }));
    fireEvent.click(screen.getByRole('img', {
      name: new RegExp(`${state.factions[enemyUnit.faction].displayName} ${enemyUnitDef.name}, health`, 'i'),
    }));

    expect(screen.getAllByText(new RegExp(`${UNIT_TYPES[attacker.type].name} strikes for`, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', {
      name: new RegExp(`city ${enemyCity.name}, health ${enemyCity.maxHp} of ${enemyCity.maxHp}`, 'i'),
    })).toBeInTheDocument();
  });

  it('keyboard activation over an enemy unit stacked on an enemy city attacks the unit first', () => {
    const { state, viewerFactionId, attacker, enemyCity } = makeEnemyUnitCityStackState(9202);

    renderGame(state);

    fireEvent.click(screen.getByRole('img', {
      name: new RegExp(`${state.factions[viewerFactionId].displayName} ${UNIT_TYPES[attacker.type].name}, health`, 'i'),
    }));

    const board = screen.getByRole('application', { name: /hex battle map/i });
    board.focus();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getAllByText(new RegExp(`${UNIT_TYPES[attacker.type].name} strikes for`, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', {
      name: new RegExp(`city ${enemyCity.name}, health ${enemyCity.maxHp} of ${enemyCity.maxHp}`, 'i'),
    })).toBeInTheDocument();
  });
});

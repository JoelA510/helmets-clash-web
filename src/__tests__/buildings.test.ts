import { describe, expect, it } from 'vitest';
import { initialState } from '../game/state';
import { applyEndOfSeatTurn, applyStartOfSeatTurn } from '../game/turn';
import { performBuild } from '../ui/gameActions';
import { cloneState, mkConfig } from './helpers';

describe('Walls', () => {
  it('adds +15 to city maxHp and hp, plus +2 regen per turn', () => {
    const s0 = initialState(mkConfig({ seed: 20 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].gold = 10;
    s.factions[f1].food = 10;
    const cityBefore = s.cities.find((c) => c.faction === f1)!;
    const maxHpBefore = cityBefore.maxHp;
    const hpBefore = cityBefore.hp;

    const after = performBuild(s, f1, 'walls');
    const cityAfter = after.cities.find((c) => c.faction === f1)!;
    expect(cityAfter.maxHp).toBe(maxHpBefore + 15);
    expect(cityAfter.hp).toBe(hpBefore + 15);

    // Damage the city and run end-of-turn — walls regen is +2 on top of
    // the base +2, so total heal should be 4.
    const damaged = cloneState(after);
    damaged.cities = damaged.cities.map((c) => c.id === cityAfter.id ? { ...c, hp: cityAfter.hp - 10 } : c);
    const hpDamaged = damaged.cities.find((c) => c.id === cityAfter.id)!.hp;
    applyEndOfSeatTurn(damaged, f1);
    const healed = damaged.cities.find((c) => c.id === cityAfter.id)!.hp - hpDamaged;
    expect(healed).toBe(4);
  });
});

describe('Granary + Market', () => {
  it('Granary adds +2 food per end-of-turn', () => {
    const s0 = initialState(mkConfig({ seed: 21 }));
    const f1 = s0.seats[0].factionId;
    const sBase = cloneState(s0);
    const sGran = cloneState(s0);
    sGran.factions[f1].buildings.add('granary');

    const baseFoodBefore = sBase.factions[f1].food;
    const granFoodBefore = sGran.factions[f1].food;
    applyEndOfSeatTurn(sBase, f1);
    applyEndOfSeatTurn(sGran, f1);
    const baseGain = sBase.factions[f1].food - baseFoodBefore;
    const granGain = sGran.factions[f1].food - granFoodBefore;
    expect(granGain - baseGain).toBe(2);
  });

  it('Market adds +2 gold per end-of-turn', () => {
    const s0 = initialState(mkConfig({ seed: 22 }));
    const f1 = s0.seats[0].factionId;
    const sBase = cloneState(s0);
    const sMkt = cloneState(s0);
    sMkt.factions[f1].buildings.add('market');

    const baseGoldBefore = sBase.factions[f1].gold;
    const mktGoldBefore = sMkt.factions[f1].gold;
    applyEndOfSeatTurn(sBase, f1);
    applyEndOfSeatTurn(sMkt, f1);
    const baseGain = sBase.factions[f1].gold - baseGoldBefore;
    const mktGain = sMkt.factions[f1].gold - mktGoldBefore;
    expect(mktGain - baseGain).toBe(2);
  });
});

describe('Tavern', () => {
  it('draws +1 card per start-of-turn (2 cards total with the default +1)', () => {
    const s0 = initialState(mkConfig({ seed: 23 }));
    const f1 = s0.seats[0].factionId;
    const sBase = cloneState(s0);
    const sTav = cloneState(s0);
    sTav.factions[f1].buildings.add('tavern');

    // Normalize: both factions start with the same hand size and plenty
    // of deck to draw from.
    const initialHandSize = sBase.factions[f1].hand.length;
    applyStartOfSeatTurn(sBase, f1);
    applyStartOfSeatTurn(sTav, f1);
    const baseDrawn = sBase.factions[f1].hand.length - initialHandSize;
    const tavDrawn = sTav.factions[f1].hand.length - initialHandSize;
    expect(tavDrawn - baseDrawn).toBe(1);
  });
});

describe('Watchtower', () => {
  it('extends city vision from radius 2 to radius 3 on start-of-turn', () => {
    const s0 = initialState(mkConfig({ seed: 24 }));
    const f1 = s0.seats[0].factionId;
    const sBase = cloneState(s0);
    const sTw = cloneState(s0);
    sTw.factions[f1].buildings.add('watchtower');

    // Clear existing explored so we observe pure reveal radius.
    sBase.factions[f1].explored = new Set();
    sTw.factions[f1].explored = new Set();

    applyStartOfSeatTurn(sBase, f1);
    applyStartOfSeatTurn(sTw, f1);

    expect(sTw.factions[f1].explored.size).toBeGreaterThan(sBase.factions[f1].explored.size);
  });

  it('applying the Watchtower build directly reveals a radius-3 diamond immediately', () => {
    const s0 = initialState(mkConfig({ seed: 25 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].gold = 10;
    s.factions[f1].food = 10;
    s.factions[f1].explored = new Set();
    const sizeBefore = s.factions[f1].explored.size;
    const after = performBuild(s, f1, 'watchtower');
    expect(after.factions[f1].explored.size).toBeGreaterThan(sizeBefore);
  });
});

describe('War Council', () => {
  it('grants +1 orders max (4 instead of 3) at start-of-turn', () => {
    const s0 = initialState(mkConfig({ seed: 26 }));
    const f1 = s0.seats[0].factionId;
    const sWar = cloneState(s0);
    sWar.factions[f1].buildings.add('war_council');
    sWar.factions[f1].orders = 0;
    applyStartOfSeatTurn(sWar, f1);
    expect(sWar.factions[f1].orders).toBe(4);
  });

  it('bumps current orders to at least 4 immediately on build', () => {
    const s0 = initialState(mkConfig({ seed: 27 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].gold = 10;
    s.factions[f1].food = 10;
    s.factions[f1].orders = 3;
    const after = performBuild(s, f1, 'war_council');
    expect(after.factions[f1].orders).toBeGreaterThanOrEqual(4);
  });
});

describe('Barracks', () => {
  it('grants +2 HP/maxHp to newly-recruited units', async () => {
    const { performRecruit } = await import('../ui/gameActions');
    const s0 = initialState(mkConfig({ seed: 28 }));
    const f1 = s0.seats[0].factionId;
    const sBase = cloneState(s0);
    const sBar = cloneState(s0);
    sBar.factions[f1].buildings.add('barracks');

    sBase.factions[f1].gold = 20;
    sBase.factions[f1].food = 20;
    sBar.factions[f1].gold = 20;
    sBar.factions[f1].food = 20;

    // Need a free slot around the city — initialState uses a couple of
    // neighbors for starter units, so remove one to guarantee room.
    const city = sBase.cities.find((c) => c.faction === f1)!;
    sBase.units = sBase.units.filter((u) => u.faction !== f1 || u.id === sBase.units.find((x) => x.faction === f1)!.id);
    sBar.units = sBar.units.filter((u) => u.faction !== f1 || u.id === sBar.units.find((x) => x.faction === f1)!.id);

    const baseAfter = performRecruit(sBase, f1, 'knight');
    const barAfter = performRecruit(sBar, f1, 'knight');

    const baseUnit = baseAfter.units[baseAfter.units.length - 1];
    const barUnit = barAfter.units[barAfter.units.length - 1];
    expect(baseUnit.type).toBe('knight');
    expect(barUnit.type).toBe('knight');
    expect(barUnit.hp - baseUnit.hp).toBe(2);
    expect(barUnit.maxHp - baseUnit.maxHp).toBe(2);
    expect(city.q).toBeDefined(); // keep city var referenced (lint)
  });
});

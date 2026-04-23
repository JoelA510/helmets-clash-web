import { describe, expect, it } from 'vitest';
import { initialState } from '../game/state';
import { computeMoveRange, resolveUnitCombat } from '../game/logic';
import { applyEndOfSeatTurn } from '../game/turn';
import { performBuild, performPlayTargetedCard, performPlayUntargetedCard } from '../ui/gameActions';
import { reducer } from '../game/reducer';
import { hexKey } from '../game/hex';
import { CARD_POOL } from '../game/constants';
import type { Card, CardId, FactionId } from '../game/types';
import { cloneState, mkConfig } from './helpers';

const forceCard = (factionId: FactionId, id: CardId): Card => {
  const tpl = CARD_POOL.find((c) => c.id === id)!;
  return { ...tpl, uid: `${factionId}:${tpl.id}#test` };
};

describe('terrain defense', () => {
  it('forest (+2 def) reduces damage taken vs grass', () => {
    const s0 = initialState(mkConfig({ seed: 1001 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const def = s0.units.find((u) => u.faction === f2)!;

    // Grass baseline
    const grass = cloneState(s0);
    const aG = grass.units.find((u) => u.id === atk.id)!;
    const dG = grass.units.find((u) => u.id === def.id)!;
    aG.q = 0; aG.r = 0; dG.q = 1; dG.r = 0;
    grass.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'grass' };
    const dmgGrass = resolveUnitCombat(aG, dG, { map: grass.map, units: grass.units });

    // Forest — defender sits on forest, -2 dmg.
    const forest = cloneState(s0);
    const aF = forest.units.find((u) => u.id === atk.id)!;
    const dF = forest.units.find((u) => u.id === def.id)!;
    aF.q = 0; aF.r = 0; dF.q = 1; dF.r = 0;
    forest.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'forest' };
    const dmgForest = resolveUnitCombat(aF, dF, { map: forest.map, units: forest.units });

    expect(dmgForest).toBe(Math.max(1, dmgGrass - 2));
  });
});

describe('flanking', () => {
  it('+1 attack when defender has 2+ adjacent enemy allies of attacker', () => {
    const s0 = initialState(mkConfig({ seed: 1002 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const def = s0.units.find((u) => u.faction === f2)!;

    const base = cloneState(s0);
    const baseA = base.units.find((u) => u.id === atk.id)!;
    const baseD = base.units.find((u) => u.id === def.id)!;
    baseA.q = 0; baseA.r = 0; baseD.q = 1; baseD.r = 0;
    base.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'grass' };
    const baseDmg = resolveUnitCombat(baseA, baseD, { map: base.map, units: base.units });

    // Add a second ally (non-attacker) adjacent to the defender — triggers +1.
    const flanked = cloneState(s0);
    const fA = flanked.units.find((u) => u.id === atk.id)!;
    const fD = flanked.units.find((u) => u.id === def.id)!;
    fA.q = 0; fA.r = 0; fD.q = 1; fD.r = 0;
    flanked.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'grass' };
    // Push a buddy to the defender's "west" (q=2, r=0 — adjacent).
    flanked.units.push({ ...fA, id: 99999, q: 2, r: 0 });
    const flankedDmg = resolveUnitCombat(fA, fD, { map: flanked.map, units: flanked.units });

    expect(flankedDmg).toBe(baseDmg + 1);
  });
});

describe('zone of control', () => {
  it('movement halts on entering enemy ZoC', () => {
    const s0 = initialState(mkConfig({ seed: 1003 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const ally = s0.units.find((u) => u.faction === f1)!;
    const enemy = s0.units.find((u) => u.faction === f2)!;

    const s = cloneState(s0);
    const u = s.units.find((x) => x.id === ally.id)!;
    const e = s.units.find((x) => x.id === enemy.id)!;
    u.q = 0; u.r = 0;
    e.q = 2; e.r = 0; // Enemy 2 hexes east.
    for (let q = 0; q <= 5; q++) s.map[hexKey(q, 0)] = { q, r: 0, type: 'grass' };

    const range = computeMoveRange(u, s);
    // (1,0) is adjacent to the enemy — in their ZoC. You can enter but
    // not move through, so (3,0) / (4,0) should not be reachable because
    // they'd require passing through (1,0) or being adjacent to enemy.
    // Simplest assertion: entering the ZoC hex (1,0) is allowed, but
    // expanding from it is blocked — so e.g. we can't reach (4,0).
    expect(range.has(hexKey(1, 0))).toBe(true);
    // With movement 2 (knight baseline) and ZoC halting at (1,0), (3,0)
    // should not be reachable even though it's within raw distance 2 via
    // the not-yet-blocked path.
    expect(range.has(hexKey(3, 0))).toBe(false);
  });
});

describe('unit leveling', () => {
  it('awards a level after 2 kills: +1 atk, +1 maxHp, full heal', () => {
    const s0 = initialState(mkConfig({ seed: 1004 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const attacker = s0.units.find((u) => u.faction === f1)!;

    const s = cloneState(s0);
    const a = s.units.find((u) => u.id === attacker.id)!;
    a.q = 0; a.r = 0;
    // Fabricate two fragile enemy targets at (1,0) sequentially.
    const mkWeak = (id: number, q: number): typeof a => ({
      ...a, id, faction: f2 as FactionId, q, r: 0, hp: 1, maxHp: 1, kills: 0, level: 0,
    });
    s.units.push(mkWeak(77771, 1));
    s.units.push(mkWeak(77772, 1)); // will be reached after the first dies
    s.map[hexKey(0, 0)] = { q: 0, r: 0, type: 'grass' };
    s.map[hexKey(1, 0)] = { q: 1, r: 0, type: 'grass' };

    const maxHpBefore = a.maxHp;
    const atkBefore = (a.atkBuff || 0);

    // Kill #1
    const first = s.units.find((u) => u.id === 77771)!;
    resolveUnitCombat(a, first, { map: s.map, units: s.units });
    expect(a.kills).toBe(1);
    expect(a.level).toBe(0);

    // Kill #2 → levels up.
    const second = s.units.find((u) => u.id === 77772)!;
    resolveUnitCombat(a, second, { map: s.map, units: s.units });
    expect(a.kills).toBe(2);
    expect(a.level).toBe(1);
    expect(a.maxHp).toBe(maxHpBefore + 1);
    expect(a.hp).toBe(a.maxHp); // healed to full on level up
    // atkBuff is unchanged; level bonus is applied via levelAtkBonus in
    // subsequent combats, not written onto atkBuff.
    expect(a.atkBuff).toBe(atkBefore);
  });
});

describe('undo buffer', () => {
  it('is null on fresh state, populated after MOVE_UNIT', () => {
    const s0 = initialState(mkConfig({ seed: 1005 }));
    expect(s0.undoBuffer).toBe(null);
    const unit = s0.units[0];
    const target = { q: unit.q + 1, r: unit.r };
    s0.map[hexKey(target.q, target.r)] = { q: target.q, r: target.r, type: 'grass' };
    // Ensure no enemy blocks ZoC.
    const s1 = reducer(s0, { type: 'MOVE_UNIT', unitId: unit.id, q: target.q, r: target.r, moveCost: 1 });
    expect(s1.undoBuffer).not.toBe(null);
    expect(s1.undoBuffer?.unitId).toBe(unit.id);

    const s2 = reducer(s1, { type: 'UNDO_MOVE' });
    const restored = s2.units.find((u) => u.id === unit.id)!;
    expect(restored.q).toBe(unit.q);
    expect(restored.r).toBe(unit.r);
    expect(s2.undoBuffer).toBe(null);
  });
});

describe('Temple', () => {
  it('heals friendly units within 3 hexes of city at end of turn', () => {
    const s0 = initialState(mkConfig({ seed: 1006 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].buildings = new Set([...s.factions[f1].buildings, 'temple']);
    // Damage a unit that's adjacent to the city.
    const city = s.cities.find((c) => c.faction === f1)!;
    const unit = s.units.find((u) => u.faction === f1)!;
    const u = s.units.find((x) => x.id === unit.id)!;
    u.q = city.q; u.r = city.r + 1;
    u.hp = Math.max(1, u.maxHp - 5);
    const hpBefore = u.hp;
    applyEndOfSeatTurn(s, f1);
    const healed = s.units.find((x) => x.id === unit.id)!.hp;
    expect(healed).toBe(Math.min(u.maxHp, hpBefore + 2));
  });
});

describe('tier-2 buildings', () => {
  it('Granary + Granary2 both apply (+4 food/turn vs base 2)', () => {
    const s0 = initialState(mkConfig({ seed: 1007 }));
    const f1 = s0.seats[0].factionId;

    const base = cloneState(s0);
    const food0 = base.factions[f1].food;
    applyEndOfSeatTurn(base, f1);
    const baseGain = base.factions[f1].food - food0;

    const upgraded = cloneState(s0);
    upgraded.factions[f1].buildings = new Set([...upgraded.factions[f1].buildings, 'granary', 'granary2']);
    const food1 = upgraded.factions[f1].food;
    applyEndOfSeatTurn(upgraded, f1);
    const upgGain = upgraded.factions[f1].food - food1;

    expect(upgGain - baseGain).toBe(4); // +2 base +2 tier-2
  });

  it('performBuild rejects a tier-2 building without the base', () => {
    const s0 = initialState(mkConfig({ seed: 1008 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].gold = 20;
    s.factions[f1].food = 20;
    const after = performBuild(s, f1, 'granary2');
    expect(after).toBe(s); // no change
    expect(after.factions[f1].buildings.has('granary2')).toBe(false);
  });

  it('performBuild accepts tier-2 when the base is present', () => {
    const s0 = initialState(mkConfig({ seed: 1009 }));
    const f1 = s0.seats[0].factionId;
    const s = cloneState(s0);
    s.factions[f1].buildings = new Set([...s.factions[f1].buildings, 'granary']);
    s.factions[f1].gold = 20;
    s.factions[f1].food = 20;
    const after = performBuild(s, f1, 'granary2');
    expect(after.factions[f1].buildings.has('granary2')).toBe(true);
  });
});

describe('new cards', () => {
  it('Ambush sets ambushActive, applies +3 vs un-acted enemies', () => {
    const s0 = initialState(mkConfig({ seed: 1010 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const card = forceCard(f1, 'ambush');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    const after = performPlayUntargetedCard(s, f1, card);
    expect(after.factions[f1].ambushActive).toBe(true);

    // Now combat from f1 vs an un-acted f2 unit should do +3.
    const attacker = after.units.find((u) => u.faction === f1)!;
    const defender = after.units.find((u) => u.faction === f2)!;
    const noAmbush = cloneState(s0);
    const nA = noAmbush.units.find((u) => u.id === attacker.id)!;
    const nD = noAmbush.units.find((u) => u.id === defender.id)!;
    nA.q = 0; nA.r = 0; nD.q = 1; nD.r = 0;
    const baseDmg = resolveUnitCombat(nA, nD, { map: noAmbush.map, units: noAmbush.units, attackerFactionAmbush: false });

    const withAmbush = cloneState(after);
    const wA = withAmbush.units.find((u) => u.id === attacker.id)!;
    const wD = withAmbush.units.find((u) => u.id === defender.id)!;
    wA.q = 0; wA.r = 0; wD.q = 1; wD.r = 0;
    wD.acted = false; // explicitly un-acted
    const ambushDmg = resolveUnitCombat(wA, wD, { map: withAmbush.map, units: withAmbush.units, attackerFactionAmbush: true });

    expect(ambushDmg).toBe(baseDmg + 3);
  });

  it('Sabotage drains target faction gold + food', () => {
    const s0 = initialState(mkConfig({ seed: 1011 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const enemy = s0.units.find((u) => u.faction === f2)!;
    const card = forceCard(f1, 'sabotage');

    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    s.factions[f1].explored.add(hexKey(enemy.q, enemy.r));
    s.factions[f2].gold = 10;
    s.factions[f2].food = 10;

    const { state: after, valid } = performPlayTargetedCard(s, f1, card, enemy.q, enemy.r);
    expect(valid).toBe(true);
    expect(after.factions[f2].gold).toBe(7); // -3
    expect(after.factions[f2].food).toBe(8); // -2
  });

  it('Siege deals 6 damage to enemy city', () => {
    const s0 = initialState(mkConfig({ seed: 1012 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const city = s0.cities.find((c) => c.faction === f2)!;
    const card = forceCard(f1, 'siege');

    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    s.factions[f1].explored.add(hexKey(city.q, city.r));
    const hpBefore = city.hp;
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, city.q, city.r);
    expect(valid).toBe(true);
    const cityAfter = after.cities.find((c) => c.id === city.id);
    if (cityAfter) {
      expect(cityAfter.hp).toBe(hpBefore - 6);
    } else {
      // Destroyed outright (fragile map config)
      expect(hpBefore).toBeLessThanOrEqual(6);
    }
  });
});

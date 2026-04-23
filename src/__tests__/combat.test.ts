import { describe, expect, it } from 'vitest';
import { initialState } from '../game/state';
import { computeAttackTargets, computeMoveRange, resolveCityAttack, resolveUnitCombat } from '../game/logic';
import { performPlayerAttack } from '../ui/gameActions';
import { hexKey } from '../game/hex';
import { cloneState, mkConfig } from './helpers';

describe('unit combat', () => {
  it('deals at least 1 damage and triggers counter-attack when adjacent', () => {
    const s0 = initialState(mkConfig({ seed: 303 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const def = s0.units.find((u) => u.faction === f2)!;

    const s = cloneState(s0);
    const a = s.units.find((u) => u.id === atk.id)!;
    const d = s.units.find((u) => u.id === def.id)!;
    a.q = 0; a.r = 0;
    d.q = 1; d.r = 0;
    const atkHpBefore = a.hp;
    const defHpBefore = d.hp;
    const dmg = resolveUnitCombat(a, d);
    expect(dmg).toBeGreaterThanOrEqual(1);
    expect(d.hp).toBe(defHpBefore - dmg);
    if (d.hp > 0) {
      expect(a.hp).toBeLessThan(atkHpBefore);
    }
  });

  it('counter-attack includes defender atkBuff (Rally regression)', () => {
    const s0 = initialState(mkConfig({ seed: 808 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const def = s0.units.find((u) => u.faction === f2)!;

    const base = cloneState(s0);
    const baseA = base.units.find((u) => u.id === atk.id)!;
    const baseD = base.units.find((u) => u.id === def.id)!;
    baseA.q = 0; baseA.r = 0;
    baseD.q = 1; baseD.r = 0;
    const baseAtkHp = baseA.hp;
    resolveUnitCombat(baseA, baseD);
    const baseCounter = baseAtkHp - baseA.hp;

    const buffed = cloneState(s0);
    const bA = buffed.units.find((u) => u.id === atk.id)!;
    const bD = buffed.units.find((u) => u.id === def.id)!;
    bA.q = 0; bA.r = 0;
    bD.q = 1; bD.r = 0;
    bD.atkBuff = 4;
    const buffedAtkHp = bA.hp;
    resolveUnitCombat(bA, bD);
    const buffedCounter = buffedAtkHp - bA.hp;

    expect(buffedCounter).toBeGreaterThan(baseCounter);
  });
});

describe('city attack', () => {
  it('damages the city and never counters', () => {
    const s0 = initialState(mkConfig({ seed: 404 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const city = s0.cities.find((c) => c.faction === f2)!;

    const s = cloneState(s0);
    const a = s.units.find((u) => u.id === atk.id)!;
    const c = s.cities.find((x) => x.id === city.id)!;
    a.q = c.q; a.r = c.r + 1;
    const atkHpBefore = a.hp;
    const cityHpBefore = c.hp;
    const dmg = resolveCityAttack(a, c);
    expect(dmg).toBeGreaterThanOrEqual(1);
    expect(c.hp).toBe(cityHpBefore - dmg);
    expect(a.hp).toBe(atkHpBefore); // cities never counter
  });
});

describe('performPlayerAttack', () => {
  it('destroying last enemy city ends the game', () => {
    const s0 = initialState(mkConfig({ seed: 505 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const enemyCity = s0.cities.find((c) => c.faction === f2)!;

    const s = cloneState(s0);
    s.cities = s.cities.map((c) => c.id === enemyCity.id ? { ...c, hp: 1 } : c);
    s.units = s.units.map((u) => u.id === atk.id ? { ...u, q: enemyCity.q, r: enemyCity.r + 1 } : u);

    const s2 = performPlayerAttack(s, atk.id, {
      type: 'city',
      target: s.cities.find((c) => c.id === enemyCity.id)!,
    });
    expect(s2.cities.find((c) => c.id === enemyCity.id)).toBeUndefined();
    expect(s2.status).toBe('ended');
    expect(s2.winner).toBe(f1);
  });
});

describe('computeMoveRange', () => {
  it('excludes mountains and friendly-occupied tiles', () => {
    const s0 = initialState(mkConfig({ seed: 606 }));
    const u0 = s0.units[0];
    const s = cloneState(s0);
    const u = s.units.find((x) => x.id === u0.id)!;
    u.q = 2; u.r = 2;
    s.map[hexKey(2, 2)] = { q: 2, r: 2, type: 'grass' };
    s.map[hexKey(3, 2)] = { q: 3, r: 2, type: 'mountain' };
    expect(computeMoveRange(u, s).has(hexKey(3, 2))).toBe(false);

    s.map[hexKey(3, 2)] = { q: 3, r: 2, type: 'grass' };
    s.units.push({ ...u, id: 9999, q: 3, r: 2 });
    expect(computeMoveRange(u, s).has(hexKey(3, 2))).toBe(false);
  });
});

describe('computeAttackTargets', () => {
  it('returns enemy cities but never own cities', () => {
    const s0 = initialState(mkConfig({ seed: 707 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const atk = s0.units.find((u) => u.faction === f1)!;
    const enemyCity = s0.cities.find((c) => c.faction === f2)!;
    const myCity = s0.cities.find((c) => c.faction === f1)!;

    const s = cloneState(s0);
    const a = s.units.find((u) => u.id === atk.id)!;
    a.q = enemyCity.q; a.r = enemyCity.r + 1;
    const targets = computeAttackTargets(a, s);
    expect(targets.some((t) => t.type === 'city' && t.target.id === enemyCity.id)).toBe(true);
    expect(targets.some((t) => t.type === 'city' && t.target.id === myCity.id)).toBe(false);
  });
});

// @ts-nocheck — test harness uses loose typing (string literal widening on
// config objects, non-null post-conditions) that aren't worth annotating
// just to satisfy the compiler.
// Smoke + regression tests runnable via `npm test`. Uses tsx to run .ts
// source directly. Keeps the suite lightweight (no vitest/jest) so CI and
// local runs stay fast. Each test logs PASS/FAIL; exit code reflects any
// failure.
//
// Coverage:
//   - Mapgen connectivity guarantee across every size/type/seat combo.
//   - Rally: +2 atkBuff applies on play and clears exactly at the start
//     of that faction's next rotation (regression for the Gemini fix).
//   - AI seat turn: exactly one income + regen application per turn
//     (regression for the Codex duplicated-income P1).
//   - Victory, turn rotation, unit/city combat, move range, attack targets.

import { generateMap, finalizeMap, placeSpawns } from '../src/game/mapgen';
import { mulberry32 } from '../src/game/rng';
import { TERRAIN } from '../src/game/constants';
import { hexKey, neighbors } from '../src/game/hex';
import { checkVictory, initialState } from '../src/game/state';
import { applyStartOfSeatTurn, applyEndOfSeatTurn, nextLivingSeat } from '../src/game/turn';
import { runAITurnFor } from '../src/game/ai';
import { computeAttackTargets, computeMoveRange, resolveCityAttack, resolveUnitCombat } from '../src/game/logic';
import { performPlayerAttack, performPlayUntargetedCard } from '../src/ui/gameActions';
import type { FactionId, GameState } from '../src/game/types';

let failures = 0;
const assert = (cond: unknown, msg: string): void => {
  if (cond) {
    console.log(`  PASS  ${msg}`);
  } else {
    console.log(`  FAIL  ${msg}`);
    failures++;
  }
};
const section = (name: string): void => console.log(`\n• ${name}`);

// Deep-ish clone that preserves Sets inside faction sub-objects. JSON
// round-tripping would otherwise turn Sets into {}.
const cloneState = (s: GameState): GameState => {
  const factions = {} as GameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, GameState['factions'][FactionId]]>) {
    factions[k] = {
      ...v,
      buildings: new Set(v.buildings),
      explored: new Set(v.explored),
      hand: [...v.hand],
      deck: [...v.deck],
      discard: [...v.discard],
    };
  }
  return {
    ...s,
    factions,
    units: s.units.map((u) => ({ ...u })),
    cities: s.cities.map((c) => ({ ...c })),
    log: [...s.log],
  };
};

// ---- mapgen connectivity ----
section('mapgen connectivity');
{
  const reachable = (tiles, q, r) => {
    const start = hexKey(q, r);
    const seen = new Set([start]);
    const stack = [{ q, r }];
    while (stack.length) {
      const cur = stack.pop();
      for (const n of neighbors(cur.q, cur.r)) {
        const k = hexKey(n.q, n.r);
        if (seen.has(k)) continue;
        const t = tiles[k];
        if (!t || !TERRAIN[t.type].passable) continue;
        seen.add(k);
        stack.push(n);
      }
    }
    return seen;
  };

  const sizes = ['small', 'medium', 'large', 'huge'];
  const types = ['continents', 'islands', 'pangaea', 'highlands', 'random'];
  const seatCounts = [2, 3, 4];
  let runs = 0, bad = 0;
  for (const mapSize of sizes) {
    for (const mapType of types) {
      for (const seats of seatCounts) {
        for (let i = 0; i < 3; i++) {
          const seed = (mapSize.charCodeAt(0) * 1000 + i) ^ (seats * 31);
          const { tiles, cols, rows } = generateMap({ mapSize, mapType, seed });
          const rng = mulberry32(seed ^ 0x9e3779b9);
          const spawns = placeSpawns(tiles, seats, cols, rows, rng);
          finalizeMap(tiles, spawns);
          runs++;
          let ok = spawns.every((s) => {
            const t = tiles[hexKey(s.q, s.r)];
            return t && TERRAIN[t.type].passable;
          });
          if (ok) {
            const root = reachable(tiles, spawns[0].q, spawns[0].r);
            ok = spawns.every((s) => root.has(hexKey(s.q, s.r)));
          }
          if (!ok) bad++;
        }
      }
    }
  }
  assert(bad === 0, `${runs - bad}/${runs} generated maps have all spawns connected`);
}

// ---- Rally clears next turn ----
section('Rally: +2 atkBuff this turn, cleared at start of next rotation');
{
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 42,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const f1 = s0.seats[0].factionId;
  const rally = s0.factions[f1].deck.find((c) => c.id === 'rally')
    || s0.factions[f1].hand.find((c) => c.id === 'rally');
  // Force a rally card into the hand for the test regardless of draw luck.
  const forced = rally ? { ...rally, uid: `${f1}:rally#test` } : { id: 'rally', name: 'Rally', desc: '+2 Atk', cost: 2, target: 'none', uid: `${f1}:rally#test` };
  const s1 = { ...s0, factions: { ...s0.factions, [f1]: { ...s0.factions[f1], orders: 3, hand: [forced] } } };

  const before = s1.units.filter((u) => u.faction === f1).map((u) => u.atkBuff);
  assert(before.every((b) => b === 0), 'units start with atkBuff=0');

  const s2 = performPlayUntargetedCard(s1, f1, forced);
  const afterPlay = s2.units.filter((u) => u.faction === f1).map((u) => u.atkBuff);
  assert(afterPlay.every((b) => b === 2), 'Rally applies +2 atkBuff to all of faction units');

  // Simulate returning to f1's turn: end f1's turn, cycle through other
  // seats, start f1's turn again.
  const s = cloneState(s2);
  applyEndOfSeatTurn(s, f1);
  const next = nextLivingSeat(s, s.activeSeatIdx);
  s.activeSeatIdx = next.idx;
  applyStartOfSeatTurn(s, next.factionId);
  applyEndOfSeatTurn(s, next.factionId);
  // Now back to f1:
  const afterF1 = nextLivingSeat(s, s.activeSeatIdx);
  s.activeSeatIdx = afterF1.idx;
  applyStartOfSeatTurn(s, afterF1.factionId);
  const cleared = s.units.filter((u) => u.faction === f1).map((u) => u.atkBuff);
  assert(cleared.every((b) => b === 0), 'atkBuff is 0 at start of f1 next rotation');
}

// ---- runAITurnFor does not duplicate income / regen ----
section('runAITurnFor: income + regen are owned by applyEndOfSeatTurn');
{
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 7,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'ai', name: 'AI' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const aiId = s0.seats.find((x) => s0.factions[x.factionId].kind === 'ai').factionId;
  const aiCity0 = s0.cities.find((c) => c.faction === aiId);
  // Damage the city so a (buggy) regen pass would be observable.
  const s = cloneState(s0);
  s.cities = s.cities.map((c) => c.id === aiCity0.id ? { ...c, hp: Math.max(1, c.hp - 6) } : c);
  const damagedHp = s.cities.find((c) => c.id === aiCity0.id).hp;
  const goldBefore = s.factions[aiId].gold;
  const foodBefore = s.factions[aiId].food;

  applyStartOfSeatTurn(s, aiId);
  // Intentionally do NOT call applyEndOfSeatTurn. Any income or city-regen
  // change here would prove runAITurnFor is still duplicating the logic
  // that belongs exclusively to applyEndOfSeatTurn.
  runAITurnFor(s, aiId);

  const aiAfter = s.factions[aiId];
  const cityAfter = s.cities.find((c) => c.faction === aiId);
  const goldDelta = aiAfter.gold - goldBefore;
  const foodDelta = aiAfter.food - foodBefore;
  // AI may spend gold/food on build/recruit, so delta should be <= 0.
  assert(goldDelta <= 0, `runAITurnFor does not grant gold (delta ${goldDelta})`);
  assert(foodDelta <= 0, `runAITurnFor does not grant food (delta ${foodDelta})`);
  assert(cityAfter.hp === damagedHp, `runAITurnFor does not regen city (hp stayed ${cityAfter.hp})`);

  // And the end-of-turn path does apply them (positive side-check).
  const s2 = cloneState(s0);
  s2.cities = s2.cities.map((c) => c.id === aiCity0.id ? { ...c, hp: damagedHp } : c);
  applyEndOfSeatTurn(s2, aiId);
  const aiAfterEnd = s2.factions[aiId];
  const cityAfterEnd = s2.cities.find((c) => c.faction === aiId);
  assert(aiAfterEnd.gold - goldBefore >= 2, 'applyEndOfSeatTurn grants at least base gold');
  assert(aiAfterEnd.food - foodBefore >= 2, 'applyEndOfSeatTurn grants at least base food');
  assert(cityAfterEnd.hp > damagedHp, 'applyEndOfSeatTurn regens the city');
}

// ---- Victory: last faction standing wins ----
section('Victory: last faction with a city wins');
{
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 101,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'ai', name: 'A' },
      { kind: 'ai', name: 'B' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  assert(checkVictory(s0).status === 'playing', 'fresh 3-faction game is still playing');

  const s1 = cloneState(s0);
  // Remove two factions' cities so only the first survives.
  const firstId = s1.seats[0].factionId;
  s1.cities = s1.cities.filter((c) => c.faction === firstId);
  const v = checkVictory(s1);
  assert(v.status === 'ended', 'removing all but one faction ends the game');
  assert(v.winner === firstId, `winner is the last-standing faction (${v.winner})`);
}

// ---- Turn rotation: nextLivingSeat cycles only through alive seats ----
section('Turn rotation skips eliminated seats');
{
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 202,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'ai', name: 'A' },
      { kind: 'ai', name: 'B' },
      { kind: 'ai', name: 'C' },
    ],
  };
  const s0 = initialState(cfg);
  const seat0 = s0.seats[0];
  const seat1 = s0.seats[1];
  const seat2 = s0.seats[2];
  const seat3 = s0.seats[3];
  assert(nextLivingSeat(s0, seat0.idx)?.idx === seat1.idx, 'from seat 0 → seat 1');
  assert(nextLivingSeat(s0, seat3.idx)?.idx === seat0.idx, 'from seat 3 → seat 0 (wrap)');

  // Eliminate seat 1 by removing their city.
  const s1 = cloneState(s0);
  s1.cities = s1.cities.filter((c) => c.faction !== seat1.factionId);
  assert(nextLivingSeat(s1, seat0.idx)?.idx === seat2.idx, 'eliminated seat 1 is skipped');
}

// ---- Unit combat: counter-attack scales to 60% of defender atk ----
section('Unit combat: damage and counter-attack');
(() => {
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 303,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const f1 = s0.seats[0].factionId;
  const f2 = s0.seats[1].factionId;
  const atk = s0.units.find((u) => u.faction === f1);
  const def = s0.units.find((u) => u.faction === f2);
  assert(atk && def, 'starter units exist for both factions');
  if (!atk || !def) return;

  // Place the two units adjacent so defender's melee range counters.
  const s1 = cloneState(s0);
  const a = s1.units.find((u) => u.id === atk.id);
  const d = s1.units.find((u) => u.id === def.id);
  if (!a || !d) return;
  a.q = 0; a.r = 0;
  d.q = 1; d.r = 0;

  const atkHpBefore = a.hp;
  const defHpBefore = d.hp;
  const dmg = resolveUnitCombat(a, d);
  assert(dmg >= 1, 'attacker dealt at least 1 damage');
  assert(d.hp === defHpBefore - dmg, 'defender took exactly `dmg` damage');
  // If defender is alive and in range, attacker should have taken a counter.
  if (d.hp > 0) {
    assert(a.hp < atkHpBefore, 'defender countered an adjacent melee attack');
  }
})();

// ---- City attack: no counter-attack ----
section('City attack: deals damage, cities never counter');
(() => {
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 404,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const f1 = s0.seats[0].factionId;
  const f2 = s0.seats[1].factionId;
  const attacker = s0.units.find((u) => u.faction === f1);
  const city = s0.cities.find((c) => c.faction === f2);
  if (!attacker || !city) return;

  const s1 = cloneState(s0);
  const a = s1.units.find((u) => u.id === attacker.id);
  const c = s1.cities.find((x) => x.id === city.id);
  if (!a || !c) return;
  a.q = c.q; a.r = c.r + 1; // adjacent
  const atkHpBefore = a.hp;
  const cityHpBefore = c.hp;
  const dmg = resolveCityAttack(a, c);
  assert(dmg >= 1, 'attacker dealt at least 1 damage to city');
  assert(c.hp === cityHpBefore - dmg, 'city HP reduced exactly by `dmg`');
  assert(a.hp === atkHpBefore, 'cities never counter-attack');
})();

// ---- performPlayerAttack destroys city and triggers victory for 1v1 ----
section('performPlayerAttack: destroying last enemy city ends the game');
(() => {
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 505,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const f1 = s0.seats[0].factionId;
  const f2 = s0.seats[1].factionId;
  const attacker = s0.units.find((u) => u.faction === f1);
  const enemyCity = s0.cities.find((c) => c.faction === f2);
  if (!attacker || !enemyCity) return;

  // Bring the enemy city to 1 hp and park our unit adjacent.
  const s1 = cloneState(s0);
  s1.cities = s1.cities.map((c) => c.id === enemyCity.id ? { ...c, hp: 1 } : c);
  s1.units = s1.units.map((u) => u.id === attacker.id ? { ...u, q: enemyCity.q, r: enemyCity.r + 1 } : u);

  const s2 = performPlayerAttack(s1, attacker.id, { type: 'city', target: s1.cities.find((c) => c.id === enemyCity.id)! });
  assert(s2.cities.find((c) => c.id === enemyCity.id) === undefined, 'destroyed city is removed');
  assert(s2.status === 'ended', 'status flips to ended');
  assert(s2.winner === f1, `winner is the last-standing faction (${s2.winner})`);
})();

// ---- Move range respects terrain and occupied tiles ----
section('Move range: mountains are impassable, friendly units block');
(() => {
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 606,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const unit = s0.units[0];
  const s1 = cloneState(s0);
  const u = s1.units.find((x) => x.id === unit.id);
  if (!u) return;
  // Place unit on a guaranteed-clear tile and wall it off with mountain to the
  // east. The move range result must not include the mountain tile.
  u.q = 2; u.r = 2;
  s1.map[hexKey(2, 2)] = { q: 2, r: 2, type: 'grass' };
  s1.map[hexKey(3, 2)] = { q: 3, r: 2, type: 'mountain' };
  const range = computeMoveRange(u, s1);
  assert(!range.has(hexKey(3, 2)), 'mountain hex excluded from reachable set');

  // Now replace mountain with grass and add a friendly unit there; still blocked.
  s1.map[hexKey(3, 2)] = { q: 3, r: 2, type: 'grass' };
  s1.units.push({ ...u, id: 9999, q: 3, r: 2 });
  const range2 = computeMoveRange(u, s1);
  assert(!range2.has(hexKey(3, 2)), 'friendly-occupied hex excluded from reachable set');
})();

// ---- Attack targets: enemy units + enemy cities only ----
section('Attack targets: only enemies within range');
(() => {
  const cfg = {
    mapSize: 'small',
    mapType: 'pangaea',
    seed: 707,
    seats: [
      { kind: 'human', name: 'P1' },
      { kind: 'human', name: 'P2' },
      { kind: 'empty', name: '' },
      { kind: 'empty', name: '' },
    ],
  };
  const s0 = initialState(cfg);
  const f1 = s0.seats[0].factionId;
  const f2 = s0.seats[1].factionId;
  const attacker = s0.units.find((u) => u.faction === f1);
  const enemyCity = s0.cities.find((c) => c.faction === f2);
  const myCity = s0.cities.find((c) => c.faction === f1);
  if (!attacker || !enemyCity || !myCity) return;

  const s1 = cloneState(s0);
  const a = s1.units.find((u) => u.id === attacker.id);
  if (!a) return;
  a.q = enemyCity.q; a.r = enemyCity.r + 1;
  const targets = computeAttackTargets(a, s1);
  assert(targets.some((t) => t.type === 'city' && t.target.id === enemyCity.id),
    'enemy city in range is a valid target');
  assert(!targets.some((t) => t.type === 'city' && t.target.id === myCity.id),
    'own city is never a target');
})();

console.log(`\n${failures === 0 ? 'All tests passed.' : failures + ' test(s) failed.'}`);
process.exit(failures === 0 ? 0 : 1);

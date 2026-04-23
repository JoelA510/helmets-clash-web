// @ts-nocheck
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

import { generateMap, finalizeMap, placeSpawns } from '../src/game/mapgen';
import { mulberry32 } from '../src/game/rng';
import { TERRAIN } from '../src/game/constants';
import { hexKey, neighbors } from '../src/game/hex';
import { initialState } from '../src/game/state';
import { applyStartOfSeatTurn, applyEndOfSeatTurn, nextLivingSeat } from '../src/game/turn';
import { runAITurnFor } from '../src/game/ai';
import { performPlayUntargetedCard } from '../src/ui/gameActions';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) {
    console.log(`  PASS  ${msg}`);
  } else {
    console.log(`  FAIL  ${msg}`);
    failures++;
  }
};
const section = (name) => console.log(`\n• ${name}`);

// Deep-ish clone that preserves Sets inside faction sub-objects. JSON
// round-tripping would otherwise turn Sets into {}.
const cloneState = (s) => {
  const factions = {};
  for (const [k, v] of Object.entries(s.factions)) {
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

console.log(`\n${failures === 0 ? 'All tests passed.' : failures + ' test(s) failed.'}`);
process.exit(failures === 0 ? 0 : 1);

import type { City, GameState, Unit } from './types';
import { TERRAIN, UNIT_TYPES } from './constants';
import { hexKey, hexDistance, neighbors } from './hex';

// BFS across passable hexes, respecting friendly/enemy occupants.
export const computeMoveRange = (unit: Unit, state: GameState): Map<string, number> => {
  const reachable = new Map<string, number>();
  const maxMov = UNIT_TYPES[unit.type].mov + (unit.movBuff || 0) - (unit.moved || 0);
  if (maxMov <= 0) return reachable;

  const queue: Array<{ q: number; r: number; cost: number }> = [{ q: unit.q, r: unit.r, cost: 0 }];
  reachable.set(hexKey(unit.q, unit.r), 0);

  while (queue.length) {
    const { q, r, cost } = queue.shift()!;
    if (cost >= maxMov) continue;
    for (const n of neighbors(q, r)) {
      const key = hexKey(n.q, n.r);
      const tile = state.map[key];
      if (!tile || !TERRAIN[tile.type].passable) continue;
      const unitAt = state.units.find((u) => u.q === n.q && u.r === n.r && u.id !== unit.id);
      if (unitAt) continue;
      const cityAt = state.cities.find((c) => c.q === n.q && c.r === n.r);
      if (cityAt && cityAt.faction !== unit.faction) continue;
      const newCost = cost + 1;
      const prev = reachable.get(key);
      if (prev === undefined || prev > newCost) {
        reachable.set(key, newCost);
        queue.push({ q: n.q, r: n.r, cost: newCost });
      }
    }
  }
  reachable.delete(hexKey(unit.q, unit.r));
  return reachable;
};

// Returns attack targets in range: any enemy unit or enemy city.
export type AttackTargetPayload =
  | { type: 'unit'; target: Unit }
  | { type: 'city'; target: City };

export const computeAttackTargets = (unit: Unit, state: GameState): AttackTargetPayload[] => {
  const targets: AttackTargetPayload[] = [];
  const range = UNIT_TYPES[unit.type].range;
  state.units.forEach((u) => {
    if (u.faction === unit.faction) return;
    if (hexDistance({ q: unit.q, r: unit.r }, { q: u.q, r: u.r }) <= range) {
      targets.push({ type: 'unit', target: u });
    }
  });
  state.cities.forEach((c) => {
    if (c.faction === unit.faction) return;
    if (hexDistance({ q: unit.q, r: unit.r }, { q: c.q, r: c.r }) <= range) {
      targets.push({ type: 'city', target: c });
    }
  });
  return targets;
};

// Mutates attacker/defender in place. Used for unit-vs-unit combat. The
// defender counter-attacks if still alive AND the attacker is within
// defender's range (melee range-1 trades; ranged 2 gets free hits when
// striking from outside melee range). Both attacker's and defender's
// current atkBuff (e.g. from Rally) are factored into the damage
// calculation — otherwise a Rally'd defender's counter would undercount
// its true strength. Returns damage dealt by attacker.
export const resolveUnitCombat = (attacker: Unit, defender: Unit): number => {
  const atkType = UNIT_TYPES[attacker.type];
  const dmg = Math.max(1, atkType.atk + (attacker.atkBuff || 0));
  defender.hp -= dmg;

  if (defender.hp > 0 &&
      hexDistance(attacker, defender) <= UNIT_TYPES[defender.type].range) {
    const defRaw = UNIT_TYPES[defender.type].atk + (defender.atkBuff || 0);
    const counter = Math.max(1, Math.floor(defRaw * 0.6));
    attacker.hp -= counter;
  }
  return dmg;
};

// Mutates the city in place. Cities have no counter-attack.
export const resolveCityAttack = (attacker: Unit, city: City): number => {
  const atkType = UNIT_TYPES[attacker.type];
  const dmg = Math.max(1, atkType.atk + (attacker.atkBuff || 0));
  city.hp -= dmg;
  return dmg;
};

// Pure pathfinder used by the AI to approach an enemy for attack. BFS to
// `target`, returning the ordered list of hex coords the unit should step
// through, starting from the first hex *after* `start`.
//
// Importantly, if `target` itself is reachable (e.g. an adjacent enemy),
// the returned path stops at the hex *adjacent* to `target` — it does NOT
// include the target tile. This is intentional: the AI is expected to end
// its movement next to an enemy and then attack, not walk onto the enemy's
// tile. If `target` is unreachable, the path ends at the reachable hex
// whose hex distance to `target` is smallest (inclusive of that hex).
// Callers that need a path that *enters* a tile should look elsewhere
// (e.g. computeMoveRange for player-driven movement).
export const findPathToward = (
  unit: Unit,
  target: { q: number; r: number },
  state: GameState,
): Array<{ q: number; r: number }> => {
  const start = { q: unit.q, r: unit.r };
  const visited = new Map<string, { q: number; r: number } | null>();
  visited.set(hexKey(start.q, start.r), null);
  const queue: Array<{ q: number; r: number }> = [start];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.q === target.q && cur.r === target.r) break;
    for (const n of neighbors(cur.q, cur.r)) {
      const key = hexKey(n.q, n.r);
      if (visited.has(key)) continue;
      const tile = state.map[key];
      if (!tile || !TERRAIN[tile.type].passable) continue;
      const isTarget = n.q === target.q && n.r === target.r;
      if (!isTarget) {
        const unitAt = state.units.find((u) => u.q === n.q && u.r === n.r);
        if (unitAt) continue;
        const cityAt = state.cities.find((c) => c.q === n.q && c.r === n.r);
        if (cityAt) continue;
      }
      visited.set(key, { q: cur.q, r: cur.r });
      queue.push(n);
    }
  }

  const targetKey = hexKey(target.q, target.r);
  let endCoord: { q: number; r: number } | null = null;
  if (visited.has(targetKey)) {
    endCoord = visited.get(targetKey) ?? null;
  } else {
    let bestKey: string | null = null;
    let bestD = Infinity;
    for (const k of visited.keys()) {
      const [q, r] = k.split(',').map(Number);
      const d = hexDistance({ q, r }, target);
      if (d < bestD) { bestD = d; bestKey = k; }
    }
    if (bestKey) {
      const [q, r] = bestKey.split(',').map(Number);
      endCoord = { q, r };
    }
  }
  if (!endCoord) return [];
  const path: Array<{ q: number; r: number }> = [];
  let cur: { q: number; r: number } | null = endCoord;
  while (cur && (cur.q !== start.q || cur.r !== start.r)) {
    path.unshift(cur);
    cur = visited.get(hexKey(cur.q, cur.r)) ?? null;
  }
  return path;
};

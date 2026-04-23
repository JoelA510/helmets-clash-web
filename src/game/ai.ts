import type { City, FactionId, GameState, Unit } from './types';
import {
  BUILDINGS, TERRAIN, UNIT_TYPES,
  LIVING_UNIT_TYPES, UNDEAD_UNIT_TYPES,
} from './constants';
import { hexDistance, hexKey, neighbors } from './hex';
import { findPathToward } from './logic';

type AITarget =
  | { q: number; r: number; ref: Unit; kind: 'unit' }
  | { q: number; r: number; ref: City; kind: 'city' };

// Picks targets for a single AI faction: any enemy unit or city (any
// non-same-faction entity counts as an enemy in N-way play).
const enemyTargetsFor = (ns: GameState, factionId: FactionId): AITarget[] => [
  ...ns.units
    .filter((u) => u.faction !== factionId)
    .map<AITarget>((u) => ({ q: u.q, r: u.r, ref: u, kind: 'unit' })),
  ...ns.cities
    .filter((c) => c.faction !== factionId)
    .map<AITarget>((c) => ({ q: c.q, r: c.r, ref: c, kind: 'city' })),
];

// AI attack helper. Mutates ns in place and logs the action.
const performAIAttack = (attacker: Unit, target: AITarget, ns: GameState): void => {
  const atkType = UNIT_TYPES[attacker.type];
  const dmg = Math.max(1, atkType.atk + (attacker.atkBuff || 0));
  target.ref.hp -= dmg;

  if (target.kind === 'unit' && target.ref.hp > 0) {
    const defType = UNIT_TYPES[target.ref.type];
    if (hexDistance(attacker, target.ref) <= defType.range) {
      const defRaw = defType.atk + (target.ref.atkBuff || 0);
      const counter = Math.max(1, Math.floor(defRaw * 0.6));
      attacker.hp -= counter;
    }
  }

  const targetLabel = target.kind === 'city' ? target.ref.name : UNIT_TYPES[target.ref.type].name;
  ns.log = [...ns.log.slice(-25), {
    turn: ns.turn, faction: attacker.faction,
    text: `${UNIT_TYPES[attacker.type].name} strikes ${targetLabel} for ${dmg}.`,
  }];

  if (target.kind === 'unit' && target.ref.hp <= 0) ns.units = ns.units.filter((u) => u.id !== target.ref.id);
  else if (target.kind === 'city' && target.ref.hp <= 0) ns.cities = ns.cities.filter((c) => c.id !== target.ref.id);
  if (attacker.hp <= 0) ns.units = ns.units.filter((u) => u.id !== attacker.id);
  attacker.acted = true;
};

// Run the AI's mid-turn actions: unit movement/combat, recruiting, and
// construction. Assumes applyStartOfSeatTurn has already reset unit flags
// and that applyEndOfSeatTurn will run afterwards to grant income and city
// regen uniformly across human and AI seats — do NOT duplicate those here.
export const runAITurnFor = (ns: GameState, factionId: FactionId): void => {
  const faction = ns.factions[factionId];
  if (!faction) return;
  const city = ns.cities.find((c) => c.faction === factionId);

  // Unit actions: threat-weighted target scoring. For each of our units we
  // consider every enemy unit+city and score them by (distance, hp, prize
  // value). A "prize" is a city (higher weight) or a weak unit about to
  // die. This beats pure greedy-nearest in N-way matches, where a unit
  // sandwiched between two enemies would otherwise thrash between targets.
  //
  // Score (lower = better):
  //   distance        — always matters most, gate by movement budget
  //   - city bonus    — cities end the game; commit to the closer attacker
  //   - low-hp bonus  — units at <= 1/3 hp are prioritized (finish them)
  //   + ally-density  — tiny penalty for swarming; keeps units spread
  //
  // Snapshot ids of units we plan to act for, then re-resolve the unit
  // each iteration to skip any that died to a counter-attack earlier.
  const scoreTarget = (unit: Unit, t: AITarget): number => {
    const dist = hexDistance(unit, t);
    let score = dist;
    if (t.kind === 'city') score -= 2;
    if (t.kind === 'unit') {
      const defType = UNIT_TYPES[t.ref.type];
      if (t.ref.hp <= Math.ceil(defType.hp / 3)) score -= 1;
    }
    return score;
  };

  const myUnitIds = ns.units.filter((u) => u.faction === factionId).map((u) => u.id);
  for (const id of myUnitIds) {
    const unit = ns.units.find((u) => u.id === id);
    if (!unit) continue;
    const targets = enemyTargetsFor(ns, factionId);
    if (!targets.length) break;
    let best: AITarget | null = null;
    let bestScore = Infinity;
    let bestD = Infinity;
    targets.forEach((t) => {
      const s = scoreTarget(unit, t);
      if (s < bestScore) {
        bestScore = s;
        bestD = hexDistance(unit, t);
        best = t;
      }
    });
    if (!best) continue;

    const atkR = UNIT_TYPES[unit.type].range;
    if (bestD <= atkR) {
      performAIAttack(unit, best, ns);
      continue;
    }

    const path = findPathToward(unit, best, ns);
    if (path.length > 0) {
      const moveBudget = UNIT_TYPES[unit.type].mov;
      const step = Math.min(path.length, moveBudget);
      const destination = path[step - 1];
      unit.q = destination.q;
      unit.r = destination.r;
      unit.moved = step;
      if (hexDistance(unit, best) <= atkR) {
        performAIAttack(unit, best, ns);
      }
    }
  }

  // Construction (one per turn, priority order).
  const buildOrder = ['granary', 'market', 'walls', 'barracks'] as const;
  for (const id of buildOrder) {
    if (faction.buildings.has(id)) continue;
    const bldg = BUILDINGS[id];
    if (faction.gold >= bldg.cost.gold && faction.food >= bldg.cost.food) {
      faction.buildings.add(id);
      faction.gold -= bldg.cost.gold;
      faction.food -= bldg.cost.food;
      if (id === 'walls' && city) {
        city.maxHp += 15;
        city.hp += 15;
      }
      ns.log = [...ns.log.slice(-25), { turn: ns.turn, faction: factionId, text: `${faction.name} raises ${bldg.name}.` }];
      break;
    }
  }

  // Recruit (deterministic: enlist whenever affordable and a spawn slot
  // exists — preserves reproducibility of "Play again (same setup)").
  if (city) {
    const pool = faction.unitPool === 'undead' ? UNDEAD_UNIT_TYPES : LIVING_UNIT_TYPES;
    for (const t of pool) {
      const def = UNIT_TYPES[t];
      if (faction.gold < def.cost.gold || faction.food < def.cost.food) continue;
      const candidates = [{ q: city.q, r: city.r }, ...neighbors(city.q, city.r)];
      const free = candidates.find((c) => {
        const tile = ns.map[hexKey(c.q, c.r)];
        return tile && TERRAIN[tile.type].passable && !ns.units.find((u) => u.q === c.q && u.r === c.r);
      });
      if (free) {
        const barracksBuff = faction.buildings.has('barracks') ? 2 : 0;
        ns.units.push({
          id: Math.max(0, ...ns.units.map((u) => u.id)) + 1,
          type: t, faction: factionId,
          q: free.q, r: free.r,
          hp: def.hp + barracksBuff, maxHp: def.hp + barracksBuff,
          moved: 0, acted: true, atkBuff: 0, movBuff: 0,
        });
        faction.gold -= def.cost.gold;
        faction.food -= def.cost.food;
        ns.log = [...ns.log.slice(-25), { turn: ns.turn, faction: factionId, text: `A ${def.name} musters in ${faction.name}.` }];
        break;
      }
    }
  }
};

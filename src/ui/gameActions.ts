import type {
  AttackTarget, BuildingId, Card, FactionId, FactionState, GameState, UnitType,
} from '../game/types';
import { TERRAIN, UNIT_TYPES, BUILDINGS } from '../game/constants';
import { hexKey, neighbors } from '../game/hex';
import { shuffle } from '../game/rng';
import { resolveUnitCombat, resolveCityAttack } from '../game/logic';
import { revealArea, checkVictory } from '../game/state';

// Handle a player attack from `attackerId` against `target` (unit or city).
// Returns the updated state, or the input state unchanged if the attack
// can't resolve (missing attacker or defender).
export const performPlayerAttack = (s: GameState, attackerId: number, target: AttackTarget): GameState => {
  const ns: GameState = {
    ...s,
    units: s.units.map((u) => ({ ...u })),
    cities: s.cities.map((c) => ({ ...c })),
  };
  const atk = ns.units.find((u) => u.id === attackerId);
  if (!atk) return s;

  let dmg: number;
  if (target.type === 'unit') {
    const defender = ns.units.find((u) => u.id === target.target.id);
    if (!defender) return s;
    dmg = resolveUnitCombat(atk, defender);
    if (defender.hp <= 0) {
      ns.units = ns.units.filter((u) => u.id !== defender.id);
      ns.log = [...ns.log.slice(-25), {
        turn: ns.turn, faction: atk.faction,
        text: `${UNIT_TYPES[atk.type].name} slays a ${UNIT_TYPES[defender.type].name}.`,
      }];
    } else {
      ns.log = [...ns.log.slice(-25), {
        turn: ns.turn, faction: atk.faction,
        text: `${UNIT_TYPES[atk.type].name} strikes for ${dmg}.`,
      }];
    }
  } else {
    const city = ns.cities.find((c) => c.id === target.target.id);
    if (!city) return s;
    dmg = resolveCityAttack(atk, city);
    if (city.hp <= 0) {
      ns.cities = ns.cities.filter((c) => c.id !== city.id);
      ns.log = [...ns.log.slice(-25), {
        turn: ns.turn, faction: atk.faction,
        text: `${city.name} has fallen.`,
      }];
    } else {
      ns.log = [...ns.log.slice(-25), {
        turn: ns.turn, faction: atk.faction,
        text: `${UNIT_TYPES[atk.type].name} strikes ${city.name} for ${dmg}.`,
      }];
    }
  }

  atk.acted = true;
  atk.moved = UNIT_TYPES[atk.type].mov;
  if (atk.hp <= 0) ns.units = ns.units.filter((u) => u.id !== atk.id);

  const v = checkVictory(ns);
  ns.status = v.status === 'ended' ? 'ended' : ns.status;
  ns.winner = v.winner;
  return ns;
};

// Move a unit and reveal new tiles for that unit's faction.
export const performMove = (s: GameState, unitId: number, q: number, r: number, moveCost: number): GameState => {
  const ns: GameState = {
    ...s,
    units: s.units.map((u) => ({ ...u })),
    factions: { ...s.factions },
  };
  const u = ns.units.find((x) => x.id === unitId);
  if (!u) return s;
  u.q = q;
  u.r = r;
  u.moved += moveCost;
  const prev = ns.factions[u.faction];
  const next: FactionState = { ...prev, explored: new Set(prev.explored) };
  revealArea(next.explored, q, r, 1);
  ns.factions[u.faction] = next;
  return ns;
};

// Recruit a unit at the given faction's city.
export const performRecruit = (s: GameState, factionId: FactionId, type: UnitType): GameState => {
  const def = UNIT_TYPES[type];
  const faction = s.factions[factionId];
  if (!faction) return s;
  if (faction.gold < def.cost.gold || faction.food < def.cost.food) return s;
  const city = s.cities.find((c) => c.faction === factionId);
  if (!city) return s;

  const candidates = [{ q: city.q, r: city.r }, ...neighbors(city.q, city.r)];
  const free = candidates.find((c) => {
    const tile = s.map[hexKey(c.q, c.r)];
    if (!tile || !TERRAIN[tile.type].passable) return false;
    return !s.units.find((u) => u.q === c.q && u.r === c.r);
  });
  if (!free) return s;

  const barracksBuff = faction.buildings.has('barracks') ? 2 : 0;
  const newUnit = {
    id: Math.max(0, ...s.units.map((u) => u.id)) + 1,
    type, faction: factionId,
    q: free.q, r: free.r,
    hp: def.hp + barracksBuff, maxHp: def.hp + barracksBuff,
    moved: def.mov, acted: true, atkBuff: 0, movBuff: 0,
  };
  return {
    ...s,
    units: [...s.units, newUnit],
    factions: {
      ...s.factions,
      [factionId]: { ...faction, gold: faction.gold - def.cost.gold, food: faction.food - def.cost.food },
    },
    log: [
      ...s.log.slice(-25),
      { turn: s.turn, faction: factionId, text: `A ${def.name}${barracksBuff ? ' (veteran)' : ''} enlists in ${faction.name}.` },
    ],
  };
};

// Construct a building for the given faction.
export const performBuild = (s: GameState, factionId: FactionId, bldgId: BuildingId): GameState => {
  const bldg = BUILDINGS[bldgId];
  const faction = s.factions[factionId];
  if (!bldg || !faction) return s;
  if (faction.buildings.has(bldgId)) return s;
  if (faction.gold < bldg.cost.gold || faction.food < bldg.cost.food) return s;

  const ns: GameState = {
    ...s,
    cities: s.cities.map((c) => ({ ...c })),
    factions: { ...s.factions },
  };
  const f: FactionState = {
    ...faction,
    buildings: new Set(faction.buildings),
    explored: new Set(faction.explored),
    gold: faction.gold - bldg.cost.gold,
    food: faction.food - bldg.cost.food,
  };
  f.buildings.add(bldgId);
  if (bldgId === 'walls') {
    ns.cities = ns.cities.map((c) =>
      c.faction === factionId ? { ...c, maxHp: c.maxHp + 15, hp: c.hp + 15 } : c
    );
  }
  if (bldgId === 'watchtower') {
    const city = ns.cities.find((c) => c.faction === factionId);
    if (city) revealArea(f.explored, city.q, city.r, 3);
  }
  if (bldgId === 'war_council') {
    f.orders = Math.max(f.orders, 4);
  }
  ns.factions[factionId] = f;
  ns.log = [...s.log.slice(-25), { turn: s.turn, faction: factionId, text: `${bldg.name} constructed in ${faction.name}.` }];
  return ns;
};

// Play a non-targeted card (rally, harvest, muster, feast).
export const performPlayUntargetedCard = (s: GameState, factionId: FactionId, card: Card): GameState => {
  const faction = s.factions[factionId];
  if (!faction || faction.orders < card.cost) return s;
  const ns: GameState = {
    ...s,
    units: s.units.map((u) => ({ ...u })),
    factions: { ...s.factions },
  };
  const f: FactionState = {
    ...faction,
    hand: faction.hand.filter((c) => c.uid !== card.uid),
    discard: [...faction.discard, card],
    deck: [...faction.deck],
    orders: faction.orders - card.cost,
  };
  let logMsg = '';
  if (card.id === 'rally') {
    ns.units.forEach((u) => { if (u.faction === factionId) u.atkBuff += 2; });
    logMsg = `${f.displayName}'s banners rise — host rallied!`;
  } else if (card.id === 'harvest') {
    f.gold += 6;
    logMsg = `${f.displayName} gains 6 gold.`;
  } else if (card.id === 'muster') {
    let deck = f.deck;
    let disc = [...f.discard];
    const hand = [...f.hand];
    for (let i = 0; i < 2; i++) {
      if (!deck.length && disc.length) { deck = shuffle(disc); disc = []; }
      const drawn = deck.pop();
      if (drawn) hand.push(drawn);
    }
    f.deck = deck;
    f.discard = disc;
    f.hand = hand;
    logMsg = `${f.displayName} musters new plans.`;
  } else if (card.id === 'feast') {
    f.gold += 4;
    f.food += 4;
    logMsg = `${f.displayName} hosts a Royal Feast.`;
  }
  ns.factions[factionId] = f;
  ns.log = [...s.log.slice(-25), { turn: s.turn, faction: factionId, text: logMsg }];
  return ns;
};

// Resolve a targeted card play. Returns the new state and whether the click
// landed on a valid target (so the UI knows whether to keep targeting mode).
export const performPlayTargetedCard = (
  s: GameState, factionId: FactionId, card: Card, q: number, r: number,
): { state: GameState; valid: boolean } => {
  const faction = s.factions[factionId];
  if (!faction) return { state: s, valid: false };
  const ns: GameState = {
    ...s,
    units: s.units.map((u) => ({ ...u })),
    factions: { ...s.factions },
  };
  const f: FactionState = {
    ...faction,
    hand: [...faction.hand],
    discard: [...faction.discard],
    explored: new Set(faction.explored),
  };
  const unitAt = ns.units.find((u) => u.q === q && u.r === r);
  let valid = false;
  let effectLog = '';

  if (card.target === 'ally_unit' && unitAt && unitAt.faction === factionId) {
    if (card.id === 'march') { unitAt.movBuff += 2; effectLog = `${UNIT_TYPES[unitAt.type].name} marches forth.`; valid = true; }
    else if (card.id === 'heal') { unitAt.hp = Math.min(unitAt.maxHp, unitAt.hp + 5); effectLog = `${UNIT_TYPES[unitAt.type].name} is mended.`; valid = true; }
  } else if (card.target === 'enemy_unit' && unitAt && unitAt.faction !== factionId) {
    if (f.explored.has(hexKey(q, r))) {
      unitAt.hp -= 4;
      if (unitAt.hp <= 0) ns.units = ns.units.filter((u) => u.id !== unitAt.id);
      effectLog = `A curse withers a ${UNIT_TYPES[unitAt.type].name}.`;
      valid = true;
    }
  } else if (card.target === 'tile' && s.map[hexKey(q, r)]) {
    revealArea(f.explored, q, r, 2);
    effectLog = `${f.displayName}'s scouts map distant lands.`;
    valid = true;
  }
  if (!valid) return { state: s, valid: false };
  f.hand = f.hand.filter((c) => c.uid !== card.uid);
  f.discard.push(card);
  f.orders -= card.cost;
  ns.factions[factionId] = f;
  ns.targeting = null;
  ns.log = [...s.log.slice(-25), { turn: s.turn, faction: factionId, text: effectLog }];
  const v = checkVictory(ns);
  ns.status = v.status === 'ended' ? 'ended' : ns.status;
  ns.winner = v.winner;
  return { state: ns, valid: true };
};

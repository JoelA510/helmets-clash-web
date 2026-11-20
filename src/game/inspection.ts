import type { Card, City, FactionId, FactionState, GameState, Tile, Unit, UnitType } from './types';
import { LIVING_UNIT_TYPES, UNDEAD_UNIT_TYPES, TERRAIN, UNIT_TYPES } from './constants';
import { hexKey, neighbors } from './hex';

type CardDestination =
  | { kind: 'unit'; unit: Unit }
  | { kind: 'city'; city: City }
  | { kind: 'tile'; tile: Tile };

export function cardDestination(state: GameState, id: FactionId, card: Card, q: number, r: number): CardDestination | null {
  const faction = state.factions[id];
  const key = hexKey(q, r);
  const tile = state.map[key];
  if (!tile || !faction || faction.orders < card.cost || !faction.hand.some(c => c.uid === card.uid)) return null;
  if (card.target === 'tile') return { kind: 'tile', tile };
  if (card.target === 'enemy_city') {
    const city = state.cities.find(c => c.q === q && c.r === r && c.faction !== id);
    return city && faction.explored.has(key) ? { kind: 'city', city } : null;
  }
  const unit = state.units.find(u => u.q === q && u.r === r);
  if (!unit) return null;
  if (card.target === 'ally_unit' && unit.faction === id) return { kind: 'unit', unit };
  if (card.target === 'enemy_unit' && unit.faction !== id && faction.explored.has(key)) return { kind: 'unit', unit };
  return null;
}

export function targetedUnitStats(card: Card, unit: Unit) {
  const hp = card.id === 'heal' ? Math.min(unit.maxHp, unit.hp + 5) :
    card.id === 'hex' ? unit.hp - 4 : unit.hp;
  return { hp, movBuff: unit.movBuff + (card.id === 'march' ? 2 : 0) };
}

export const siegeHitPoints = (city: City) => city.hp - 6;

export function purchaseBalance(faction: FactionState, cost: { gold: number; food: number }) {
  const gold = faction.gold - cost.gold;
  const food = faction.food - cost.food;
  return { gold, food, affordable: gold >= 0 && food >= 0 };
}

export const recruitmentPool = (faction: FactionState): UnitType[] =>
  [...(faction.unitPool === 'undead' ? UNDEAD_UNIT_TYPES : LIVING_UNIT_TYPES), 'ballista'];

export function recruitPreview(state: GameState, faction: FactionState, type: UnitType) {
  const city = state.cities.find(c => c.faction === faction.id);
  const spawn = city && [city, ...neighbors(city.q, city.r)].find(({ q, r }) => {
    const tile = state.map[hexKey(q, r)];
    return tile && TERRAIN[tile.type].passable && !state.units.some(u => u.q === q && u.r === r);
  });
  const def = UNIT_TYPES[type];
  const hp = def.hp + (faction.buildings.has('barracks') ? 2 : 0) + (faction.buildings.has('barracks2') ? 2 : 0);
  const requires = def.requires && !faction.buildings.has(def.requires) ? def.requires : null;
  return { spawn, hp, requires, ...purchaseBalance(faction, def.cost) };
}

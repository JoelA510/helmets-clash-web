import type {
  BuildingDef, BuildingId, CardTemplate, FactionPreset,
  MapSizeId, MapTypeId, TerrainInfo, TerrainType, UnitDef, UnitType,
} from './types';

export const TERRAIN: Record<TerrainType, TerrainInfo> = {
  grass:    { color: '#8fb96a', edge: '#6d9350', name: 'Grassland', passable: true, defense: 0, yield: { food: 1 } },
  forest:   { color: '#4f7a3e', edge: '#3a5c2e', name: 'Forest',    passable: true, defense: 2, yield: { food: 1 } },
  hills:    { color: '#b09060', edge: '#876a42', name: 'Hills',     passable: true, defense: 1, yield: { gold: 1 } },
  mountain: { color: '#7a7267', edge: '#554f48', name: 'Mountain',  passable: false, defense: 0, yield: {} },
  water:    { color: '#4c82b3', edge: '#32608a', name: 'River',     passable: false, defense: 0, yield: {} },
  coast:    { color: '#6fa5cc', edge: '#4c82b3', name: 'Coast',     passable: true, defense: 0, yield: { gold: 1 } },
};

export const UNIT_TYPES: Record<UnitType, UnitDef> = {
  knight:    { name: 'Knight',    hp: 12, atk: 5, mov: 2, range: 1, cost: { gold: 4, food: 2 }, glyph: '⚔',  color: '#4a6cc4' },
  mage:      { name: 'Mage',      hp: 7,  atk: 6, mov: 2, range: 2, cost: { gold: 5, food: 3 }, glyph: '✦',  color: '#8b4ec4' },
  barbarian: { name: 'Barbarian', hp: 14, atk: 4, mov: 2, range: 1, cost: { gold: 4, food: 2 }, glyph: '⚒',  color: '#b85c3a' },
  rogue:     { name: 'Rogue',     hp: 8,  atk: 4, mov: 3, range: 1, cost: { gold: 3, food: 1 }, glyph: '⚝',  color: '#3aa870' },
  archer:    { name: 'Archer',    hp: 8,  atk: 4, mov: 2, range: 2, cost: { gold: 3, food: 2 }, glyph: '➴',  color: '#6a8b5a' },
  skeleton:  { name: 'Skeleton',  hp: 9,  atk: 4, mov: 2, range: 1, cost: { gold: 3, food: 2 }, glyph: '☠',  color: '#c4c4c4' },
  wraith:    { name: 'Wraith',    hp: 7,  atk: 5, mov: 3, range: 1, cost: { gold: 4, food: 3 }, glyph: '♆',  color: '#8a7ab8' },
  lich:      { name: 'Lich',      hp: 10, atk: 6, mov: 2, range: 2, cost: { gold: 5, food: 4 }, glyph: '⸸',  color: '#5a3a7a' },
};

export const LIVING_UNIT_TYPES: UnitType[] = ['knight', 'mage', 'barbarian', 'rogue', 'archer'];
export const UNDEAD_UNIT_TYPES: UnitType[] = ['skeleton', 'wraith', 'lich'];

// Base buildings + tier-2 upgrades. Upgrades require the base building
// and cost the same again, doubling the effect. Temple is standalone
// (no tier-2) and heals friendly units within 3 hexes at end-of-turn.
// Building availability in the UI is gated by what the faction owns:
// tier-2 upgrades only appear once their base is built.
export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  granary:     { name: 'Granary',          desc: '+2 Food per turn',                     cost: { gold: 3, food: 4 }, icon: '🌾' },
  market:      { name: 'Market',           desc: '+2 Gold per turn',                     cost: { gold: 4, food: 3 }, icon: '💰' },
  walls:       { name: 'Walls',            desc: '+15 City HP, +2 Regen/turn',           cost: { gold: 4, food: 3 }, icon: '🏯' },
  barracks:    { name: 'Barracks',         desc: 'New units gain +2 Max HP',             cost: { gold: 5, food: 5 }, icon: '🛡' },
  watchtower:  { name: 'Watchtower',       desc: 'Reveals distant lands',                cost: { gold: 3, food: 2 }, icon: '🗼' },
  tavern:      { name: 'Tavern',           desc: 'Draw +1 card per turn',                cost: { gold: 5, food: 4 }, icon: '🍻' },
  war_council: { name: 'War Council',      desc: '+1 Orders per turn',                   cost: { gold: 6, food: 6 }, icon: '📜' },
  temple:      { name: 'Temple',           desc: 'Heal 2 HP/turn to nearby allies',      cost: { gold: 6, food: 4 }, icon: '⛩' },
  granary2:    { name: 'Greater Granary',  desc: '+2 more Food per turn (req. Granary)', cost: { gold: 5, food: 6 }, icon: '🌾' },
  market2:     { name: 'Grand Market',     desc: '+2 more Gold per turn (req. Market)',  cost: { gold: 6, food: 5 }, icon: '💰' },
  walls2:      { name: 'Bastion',          desc: '+15 more City HP, +2 more Regen (req. Walls)', cost: { gold: 6, food: 5 }, icon: '🏯' },
  barracks2:   { name: 'War Academy',      desc: 'New units gain +2 more Max HP (req. Barracks)', cost: { gold: 7, food: 7 }, icon: '🛡' },
};

// Which base building (if any) each upgrade depends on. Null means no
// prerequisite. Used by the UI + performBuild to gate tier-2 buildings
// until the base tier is present.
export const BUILDING_REQUIREMENT: Record<BuildingId, BuildingId | null> = {
  granary: null,
  market: null,
  walls: null,
  barracks: null,
  watchtower: null,
  tavern: null,
  war_council: null,
  temple: null,
  granary2: 'granary',
  market2: 'market',
  walls2: 'walls',
  barracks2: 'barracks',
};

export const CARD_POOL: CardTemplate[] = [
  { id: 'march',    name: 'Forced March', desc: '+2 Move to a unit this turn',        cost: 1, target: 'ally_unit' },
  { id: 'rally',    name: 'Rally',        desc: '+2 Attack to all your units',        cost: 2, target: 'none' },
  { id: 'harvest',  name: 'Harvest',      desc: 'Gain 6 Gold',                        cost: 0, target: 'none' },
  { id: 'heal',     name: 'Healing Hand', desc: 'Restore 5 HP to an ally',            cost: 1, target: 'ally_unit' },
  { id: 'scout',    name: 'Scout',        desc: 'Reveal a 2-hex area',                cost: 1, target: 'tile' },
  { id: 'hex',      name: 'Curse',        desc: 'Deal 4 damage to an enemy',          cost: 2, target: 'enemy_unit' },
  { id: 'muster',   name: 'Muster',       desc: 'Draw 2 cards',                       cost: 1, target: 'none' },
  { id: 'feast',    name: 'Royal Feast',  desc: 'Gain 4 Gold and 4 Food',             cost: 1, target: 'none' },
  { id: 'ambush',   name: 'Ambush',       desc: '+3 Attack this turn vs un-acted enemies', cost: 2, target: 'none' },
  { id: 'sabotage', name: 'Sabotage',     desc: 'Target enemy loses 3 Gold and 2 Food', cost: 1, target: 'enemy_unit' },
  { id: 'siege',    name: 'Siege Engine', desc: 'Deal 6 damage to an enemy city',     cost: 2, target: 'enemy_city' },
];

// Faction presets. Up to 4 seats, each drives a visual identity without
// relying on color alone — every faction also has a distinct glyph/pattern.
export const FACTION_PRESETS: FactionPreset[] = [
  { id: 'f1', name: 'Aldermere',  cityName: 'Aldermere',  color: '#d6b876', accent: '#8b6b2a', glyph: '♔', pattern: 'crown',    unitPool: 'living' },
  { id: 'f2', name: 'Grimhold',   cityName: 'Grimhold',   color: '#8b6a8b', accent: '#3a1a3a', glyph: '☠', pattern: 'skull',    unitPool: 'undead' },
  { id: 'f3', name: 'Sunspire',   cityName: 'Sunspire',   color: '#e8a449', accent: '#8a4a12', glyph: '☀', pattern: 'sunburst', unitPool: 'living' },
  { id: 'f4', name: 'Moonwatch',  cityName: 'Moonwatch',  color: '#6a8fbf', accent: '#1a3a6a', glyph: '☾', pattern: 'crescent', unitPool: 'living' },
];

export const MAP_SIZES: Record<MapSizeId, { cols: number; rows: number; label: string }> = {
  small:  { cols: 9,  rows: 7,  label: 'Small'  },
  medium: { cols: 13, rows: 10, label: 'Medium' },
  large:  { cols: 17, rows: 13, label: 'Large'  },
  huge:   { cols: 22, rows: 16, label: 'Huge'   },
};

export const MAP_TYPES: Record<MapTypeId, { label: string; desc: string }> = {
  continents: { label: 'Continents', desc: 'Large landmasses with inland seas' },
  islands:    { label: 'Islands',    desc: 'Scattered land, plenty of coast'   },
  pangaea:    { label: 'Pangaea',    desc: 'One connected landmass'            },
  highlands:  { label: 'Highlands',  desc: 'Mountainous with narrow passes'    },
  random:     { label: 'Random',     desc: 'Surprise me — always connected' },
};

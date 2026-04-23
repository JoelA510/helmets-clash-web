// Single source of truth for every type the game passes around. Import
// from here instead of redefining shapes locally so the compiler can catch
// mismatches across modules.

// --- Hex grid ---

export type Hex = { q: number; r: number };
export type HexKey = string; // canonical "q,r"

// --- Terrain / tiles ---

export type TerrainType = 'grass' | 'forest' | 'hills' | 'mountain' | 'water' | 'coast';

export type TerrainInfo = {
  color: string;
  edge: string;
  name: string;
  passable: boolean;
  defense: number;
  yield: { gold?: number; food?: number };
};

export type Tile = { q: number; r: number; type: TerrainType };
export type TileMap = Record<HexKey, Tile>;

// --- Factions / seats ---

export type FactionId = 'f1' | 'f2' | 'f3' | 'f4';
export type SeatKind = 'human' | 'ai' | 'empty';
export type UnitPoolKind = 'living' | 'undead';

export type FactionPreset = {
  id: FactionId;
  name: string;
  cityName: string;
  color: string;
  accent: string;
  glyph: string;
  pattern: string;
  unitPool: UnitPoolKind;
};

export type SeatConfig = {
  kind: SeatKind;
  name: string;
};

// A seat in the running game (after dropping "empty" entries). `idx`
// preserves the original slot index so presets map 1:1 to seat numbers.
export type Seat = {
  idx: number;
  factionId: FactionId;
  kind: SeatKind;
  name: string;
};

export type FactionState = {
  id: FactionId;
  kind: SeatKind;
  name: string;
  displayName: string;
  color: string;
  accent: string;
  glyph: string;
  pattern: string;
  unitPool: UnitPoolKind;
  gold: number;
  food: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  orders: number;
  buildings: Set<BuildingId>;
  explored: Set<HexKey>;
};

// --- Units / cities ---

export type UnitType = 'knight' | 'mage' | 'barbarian' | 'rogue' | 'skeleton' | 'wraith' | 'lich';

export type UnitDef = {
  name: string;
  hp: number;
  atk: number;
  mov: number;
  range: number;
  cost: { gold: number; food: number };
  glyph: string;
  color: string;
};

export type Unit = {
  id: number;
  type: UnitType;
  faction: FactionId;
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  moved: number;
  acted: boolean;
  atkBuff: number;
  movBuff: number;
};

export type City = {
  id: number;
  faction: FactionId;
  q: number;
  r: number;
  name: string;
  hp: number;
  maxHp: number;
};

// --- Buildings / cards ---

export type BuildingId =
  | 'granary' | 'market' | 'walls' | 'barracks'
  | 'watchtower' | 'tavern' | 'war_council';

export type BuildingDef = {
  name: string;
  desc: string;
  cost: { gold: number; food: number };
  icon: string;
};

export type CardId =
  | 'march' | 'rally' | 'harvest' | 'heal'
  | 'scout' | 'hex' | 'muster' | 'feast';

export type CardTarget = 'none' | 'ally_unit' | 'enemy_unit' | 'tile';

export type CardTemplate = {
  id: CardId;
  name: string;
  desc: string;
  cost: number;
  target: CardTarget;
};

export type Card = CardTemplate & { uid: string };

// --- Map config ---

export type MapSizeId = 'small' | 'medium' | 'large' | 'huge';
export type MapTypeId = 'continents' | 'islands' | 'pangaea' | 'highlands' | 'random';

export type GameConfig = {
  mapSize: MapSizeId;
  mapType: MapTypeId;
  seats: SeatConfig[];
  seed?: number;
  // Set by initialState after resolving "random" to a concrete type.
  resolvedMapType?: MapTypeId;
};

// --- Game state ---

export type GameStatus = 'playing' | 'ended';
export type LogFaction = FactionId | 'system';
export type LogEntry = { turn: number; faction: LogFaction; text: string };
export type TargetingState = { card: Card } | null;

// Combat target wrapper passed from the UI to gameActions.
export type UnitAttackTarget = { type: 'unit'; target: Unit };
export type CityAttackTarget = { type: 'city'; target: City };
export type AttackTarget = UnitAttackTarget | CityAttackTarget;

export type GameState = {
  turn: number;
  activeSeatIdx: number;
  seed: number;
  config: GameConfig;
  map: TileMap;
  mapCols: number;
  mapRows: number;
  seats: Seat[];
  cities: City[];
  units: Unit[];
  factions: Record<FactionId, FactionState>;
  status: GameStatus;
  winner: FactionId | null;
  log: LogEntry[];
  targeting: TargetingState;
  // The currently-selected friendly unit id, or null if no selection. Drives
  // the move/attack overlays on the board. Lives on GameState (rather than
  // local UI state) so selection is part of the reducer contract and the
  // autosave captures it.
  selectedUnitId: number | null;
  // Seat that is about to play but is gated behind a pass-device screen
  // (set during endTurn when we rotate into a human seat and another human
  // currently "holds" the device). `null` means no gate is active.
  pendingPassSeatIdx: number | null;
};

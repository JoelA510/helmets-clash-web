// @ts-nocheck
import { CARD_POOL, FACTION_PRESETS, TERRAIN, UNIT_TYPES, LIVING_UNIT_TYPES, UNDEAD_UNIT_TYPES } from './constants';
import { hexKey, neighbors } from './hex';
import { mulberry32, shuffle } from './rng';
import { generateMap, finalizeMap, placeSpawns } from './mapgen';

export const makeStarterDeck = () => {
  const deck = [];
  let uid = 1;
  CARD_POOL.forEach((c) => {
    const copies = c.cost <= 1 ? 2 : 1;
    for (let i = 0; i < copies; i++) deck.push({ ...c, uid: uid++ });
  });
  return shuffle(deck);
};

// Returns the list of active seats (kind !== 'empty'). Each gets a faction
// preset assigned in order.
export const activeSeats = (config) => {
  return config.seats
    .map((seat, idx) => ({ ...seat, idx }))
    .filter((s) => s.kind !== 'empty')
    .map((s, i) => ({ ...s, factionId: FACTION_PRESETS[i].id }));
};

const unitPoolFor = (preset) =>
  preset.unitPool === 'undead' ? UNDEAD_UNIT_TYPES : LIVING_UNIT_TYPES;

// Reveal a diamond area around (q,r) on a per-faction explored set.
export const revealArea = (explored, q, r, radius = 2) => {
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const ds = -dq - dr;
      if (Math.abs(dq) + Math.abs(dr) + Math.abs(ds) <= 2 * radius) {
        explored.add(hexKey(q + dq, r + dr));
      }
    }
  }
};

export const initialState = (config) => {
  const seed = config.seed ?? Math.floor(Math.random() * 1_000_000);
  const { tiles, cols, rows, resolvedType } = generateMap({ ...config, seed });

  const seats = activeSeats(config);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const spawns = placeSpawns(tiles, seats.length, cols, rows, rng);
  finalizeMap(tiles, spawns);

  // Build factions + initial units/cities per seat.
  let unitUid = 1;
  const mkUnit = (type, q, r, factionId) => ({
    id: unitUid++, type, faction: factionId, q, r,
    hp: UNIT_TYPES[type].hp, maxHp: UNIT_TYPES[type].hp,
    moved: 0, acted: false, atkBuff: 0, movBuff: 0,
  });

  const factions = {};
  const cities = [];
  const units = [];
  seats.forEach((seat, i) => {
    const preset = FACTION_PRESETS.find((p) => p.id === seat.factionId);
    const spawn = spawns[i];
    const explored = new Set();
    revealArea(explored, spawn.q, spawn.r, 2);
    const deck = makeStarterDeck();
    const hand = seat.kind === 'human' ? deck.splice(0, 4) : [];

    factions[seat.factionId] = {
      id: seat.factionId,
      kind: seat.kind,
      name: preset.cityName,
      displayName: seat.name || preset.name,
      color: preset.color,
      accent: preset.accent,
      glyph: preset.glyph,
      pattern: preset.pattern,
      unitPool: preset.unitPool,
      gold: 5,
      food: 5,
      deck,
      hand,
      discard: [],
      orders: 3,
      rallyActive: false,
      buildings: new Set(),
      explored,
    };

    cities.push({
      id: i + 1,
      faction: seat.factionId,
      q: spawn.q,
      r: spawn.r,
      name: preset.cityName,
      hp: 20,
      maxHp: 20,
    });

    const pool = unitPoolFor(preset);
    // Two starter units near the city.
    const starterTypes = seat.kind === 'human'
      ? [pool[0], pool[3 % pool.length]]
      : [pool[0], pool[1 % pool.length]];
    const nearby = [{ q: spawn.q, r: spawn.r }, ...neighbors(spawn.q, spawn.r)];
    let placed = 0;
    for (const slot of nearby) {
      if (placed >= starterTypes.length) break;
      const tile = tiles[hexKey(slot.q, slot.r)];
      if (!tile || !TERRAIN[tile.type].passable) continue;
      if (units.some((u) => u.q === slot.q && u.r === slot.r)) continue;
      units.push(mkUnit(starterTypes[placed], slot.q, slot.r, seat.factionId));
      placed++;
    }
  });

  // Start with the first non-empty seat active. If that seat is human we
  // still need a pass-device gate on the very first turn so a second human
  // doesn't glimpse state. We only set passRequired on transitions, not at
  // T=1, so everyone sees the first turn as their own.
  const firstSeatIdx = seats[0].idx;

  return {
    turn: 1,
    activeSeatIdx: firstSeatIdx,
    seed,
    config: { ...config, seed, resolvedMapType: resolvedType },
    map: tiles,
    mapCols: cols,
    mapRows: rows,
    seats,
    cities,
    units,
    factions,
    status: 'playing',
    winner: null,
    log: [{ turn: 1, faction: 'system', text: `The ${seats.length}-way war begins. Resolved map: ${resolvedType}.` }],
    targeting: null,
    // True when the next render should gate play behind a pass-device screen.
    passRequired: false,
    // Tracks who is supposed to be about to play after passRequired resolves.
    pendingSeatIdx: firstSeatIdx,
  };
};

// Who is the currently-active seat?
export const activeSeat = (state) => state.seats.find((s) => s.idx === state.activeSeatIdx);
export const activeFaction = (state) => {
  const seat = activeSeat(state);
  return seat ? state.factions[seat.factionId] : null;
};

// Return factions that are "alive" (still own at least one city).
export const aliveFactions = (state) =>
  Object.values(state.factions).filter((f) =>
    state.cities.some((c) => c.faction === f.id)
  );

// Determine end-of-game state: last faction standing wins.
export const checkVictory = (state) => {
  const alive = aliveFactions(state);
  if (alive.length <= 1) {
    return { status: 'ended', winner: alive[0]?.id ?? null };
  }
  return { status: 'playing', winner: null };
};

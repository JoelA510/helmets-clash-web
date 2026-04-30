import { describe, expect, it } from 'vitest';
import { FACTION_PRESETS, RUNTIME_FACTION_IDS } from '../game/constants';
import { migrateLoadedGameState } from '../game/persist';
import { initialState } from '../game/state';
import { mkConfig } from './helpers';

describe('persist migration/hydration', () => {
  it('loads current serialized saves unchanged and rehydrates buildings/explored as Set', () => {
    const state = initialState(mkConfig());
    const serial = {
      ...state,
      factions: Object.fromEntries(
        Object.entries(state.factions).map(([id, faction]) => [
          id,
          { ...faction, buildings: Array.from(faction.buildings), explored: Array.from(faction.explored) },
        ]),
      ),
    };

    const loaded = migrateLoadedGameState(serial);
    expect(loaded).toBeTruthy();
    expect(loaded?.seats).toEqual(state.seats);
    expect(loaded?.factions.f1.factionPresetId).toBe(state.factions.f1.factionPresetId);
    expect(loaded?.factions.f1.explored).toBeInstanceOf(Set);
    expect(loaded?.factions.f1.buildings).toBeInstanceOf(Set);
  });

  it('fills missing seat.factionPresetId deterministically from active sourceIdx order', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: state.seats.map((seat) => {
        const { factionPresetId, ...rest } = seat;
        void factionPresetId;
        return rest;
      }),
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.seats[0].factionPresetId).toBe('aldermere');
    expect(migrated?.seats[1].factionPresetId).toBe('grimhold');
  });

  it('drops empty seats during migration and keeps only active runtime seats', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: [
        { ...state.seats[0], factionPresetId: undefined },
        { idx: 1, kind: 'empty', name: 'unused', factionId: 'f4' },
        { ...state.seats[1], factionPresetId: undefined },
      ],
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.seats.every((s) => s.kind !== 'empty')).toBe(true);
    expect(migrated?.seats).toHaveLength(2);
    expect(migrated?.seats[0].factionPresetId).toBe('aldermere');
    expect(migrated?.seats[1].factionPresetId).toBe('grimhold');
  });

  it('backfills missing idx/factionId deterministically (idx from sourceIdx, faction from runtimeIdx)', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: [
        { kind: 'human', name: 'P1', factionPresetId: 'moonwatch' },
        { kind: 'empty', name: 'skip me', factionPresetId: 'aldermere' },
        { idx: NaN, kind: 'ai', name: 'P2', factionId: 'bad', factionPresetId: 'sunspire' },
      ],
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.seats).toHaveLength(2);
    expect(migrated?.seats[0]).toMatchObject({ idx: 0, factionId: 'f1', factionPresetId: 'moonwatch' });
    expect(migrated?.seats[1]).toMatchObject({ idx: 2, factionId: 'f2', factionPresetId: 'sunspire' });
  });

  it('caps active seats to RUNTIME_FACTION_IDS.length and recomputes activeSeatIdx', () => {
    const state = initialState(mkConfig());
    const baseFaction = state.factions.f1;
    const serialFactions = {
      f1: { ...baseFaction, buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
      f2: { ...baseFaction, id: 'f2', buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
      f3: { ...baseFaction, id: 'f3', buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
      f4: { ...baseFaction, id: 'f4', buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
    };
    const legacy = {
      ...state,
      factions: serialFactions,
      seats: [
        { idx: 0, kind: 'human', name: 'P1', factionId: 'f1', factionPresetId: 'aldermere' },
        { idx: 1, kind: 'ai', name: 'P2', factionId: 'f2', factionPresetId: 'grimhold' },
        { idx: 2, kind: 'ai', name: 'P3', factionId: 'f3', factionPresetId: 'sunspire' },
        { idx: 3, kind: 'ai', name: 'P4', factionId: 'f4', factionPresetId: 'moonwatch' },
        { idx: 4, kind: 'ai', name: 'P5', factionId: 'f1', factionPresetId: 'aldermere' },
      ],
      activeSeatIdx: 4,
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.seats).toHaveLength(RUNTIME_FACTION_IDS.length);
    expect(migrated?.activeSeatIdx).toBe(RUNTIME_FACTION_IDS.length - 1);
  });

  it('returns null when migrated seats reference a faction absent from migrated factions', () => {
    const state = initialState(mkConfig());
    const baseFaction = state.factions.f1;
    const serialFactions = {
      f1: { ...baseFaction, buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
      f2: { ...baseFaction, id: 'f2', buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
      f3: { ...baseFaction, id: 'f3', buildings: Array.from(baseFaction.buildings), explored: Array.from(baseFaction.explored) },
    };
    const legacy = {
      ...state,
      factions: serialFactions,
      seats: [
        { idx: 0, kind: 'human', name: 'P1', factionId: 'f1', factionPresetId: 'aldermere' },
        { idx: 1, kind: 'ai', name: 'P2', factionId: 'f2', factionPresetId: 'grimhold' },
        { idx: 2, kind: 'ai', name: 'P3', factionId: 'f3', factionPresetId: 'sunspire' },
        { idx: 3, kind: 'ai', name: 'P4', factionId: 'f4', factionPresetId: 'moonwatch' },
      ],
      activeSeatIdx: 3,
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeNull();
  });

  it('migrated active seats deterministically normalize kind/name/idx/factionId/factionPresetId', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: [
        { kind: 'invalid-kind', name: 7, factionId: 'invalid', factionPresetId: 'invalid', idx: NaN },
        { kind: 'ai', name: 'ok', factionId: 'f2', factionPresetId: 'grimhold', idx: 42 },
      ],
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.seats).toHaveLength(2);
    expect(migrated?.seats[0]).toMatchObject({
      kind: 'human',
      name: '',
      idx: 0,
      factionId: 'f1',
      factionPresetId: 'aldermere',
    });
    expect(migrated?.seats[1]).toMatchObject({
      kind: 'ai',
      name: 'ok',
      idx: 42,
      factionId: 'f2',
      factionPresetId: 'grimhold',
    });
    expect(migrated?.seats.every((seat) => RUNTIME_FACTION_IDS.includes(seat.factionId))).toBe(true);
    expect(migrated?.seats.every((seat) => FACTION_PRESETS.some((p) => p.id === seat.factionPresetId))).toBe(true);
  });

  it('fills missing faction.factionPresetId using seat mapping/runtime fallback with valid presets', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: state.seats.map((seat) => {
        const { factionPresetId, ...rest } = seat;
        void factionPresetId;
        return rest;
      }),
      factions: Object.fromEntries(
        Object.entries(state.factions).map(([id, faction]) => {
          const { factionPresetId, ...rest } = faction;
          void factionPresetId;
          return [id, { ...rest, buildings: Array.from(faction.buildings), explored: Array.from(faction.explored) }];
        }),
      ),
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    const ids = Object.values(migrated!.factions).map((f) => f.factionPresetId);
    expect(ids.every((id) => FACTION_PRESETS.some((p) => p.id === id))).toBe(true);
    expect(ids.includes('aldermere')).toBe(true);
  });

  it('ignores invalid faction keys while preserving valid faction migration', () => {
    const state = initialState(mkConfig());
    const serial = {
      ...state,
      factions: {
        ...Object.fromEntries(
          Object.entries(state.factions).map(([id, faction]) => [
            id,
            { ...faction, buildings: Array.from(faction.buildings), explored: Array.from(faction.explored) },
          ]),
        ),
        badFaction: {
          ...state.factions.f1,
          factionPresetId: 'moonwatch',
          buildings: [],
          explored: [],
        },
      },
    };

    const migrated = migrateLoadedGameState(serial);
    expect(migrated).toBeTruthy();
    const factionKeys = Object.keys(migrated!.factions);
    expect(factionKeys.every((k) => ['f1', 'f2', 'f3', 'f4'].includes(k))).toBe(true);
    expect(factionKeys).not.toContain('badFaction');
    expect(migrated!.factions.f1.factionPresetId).toBe(state.factions.f1.factionPresetId);
  });

  it('normalizes existing config.seats kind/name/preset defaults', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      config: {
        ...state.config,
        seats: [
          { kind: 'invalid-kind', name: 9, factionPresetId: 'invalid' },
          { kind: 'ai', name: 'CPU', factionPresetId: 'grimhold' },
        ],
      },
    };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.config.seats[0]).toMatchObject({ kind: 'human', name: '', factionPresetId: 'aldermere' });
    expect(migrated?.config.seats[1]).toMatchObject({ kind: 'ai', name: 'CPU', factionPresetId: 'grimhold' });
  });

  it('reconstructs missing config.seats from migrated seats', () => {
    const state = initialState(mkConfig());
    const { seats: _legacyConfigSeats, ...legacyConfigNoSeats } = state.config;
    void _legacyConfigSeats;
    const legacy = { ...state, config: legacyConfigNoSeats };

    const migrated = migrateLoadedGameState(legacy);
    expect(migrated).toBeTruthy();
    expect(migrated?.config.seats).toHaveLength(state.seats.length);
    expect(migrated?.config.seats[0].factionPresetId).toBe(state.seats[0].factionPresetId);
  });

  it('returns null when arrays contain null/primitives or when required shape fields are invalid/missing', () => {
    const state = initialState(mkConfig());
    expect(migrateLoadedGameState({ ...state, cities: [null] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, cities: [1] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, units: [null] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, units: ['x'] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, log: [null] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, log: [true] })).toBeNull();
    expect(migrateLoadedGameState({ ...state, config: null })).toBeNull();

    const { mapCols: _mapCols, ...missingMapCols } = state;
    void _mapCols;
    expect(migrateLoadedGameState(missingMapCols)).toBeNull();

    const { mapRows: _mapRows, ...missingMapRows } = state;
    void _mapRows;
    expect(migrateLoadedGameState(missingMapRows)).toBeNull();

    expect(migrateLoadedGameState({ ...state, status: 'paused' })).toBeNull();
  });

  it('returns null for malformed config.seats', () => {
    const state = initialState(mkConfig());
    expect(migrateLoadedGameState({ ...state, config: { ...state.config, seats: 'bad' } })).toBeNull();
    expect(migrateLoadedGameState({ ...state, config: { ...state.config, seats: [null] } })).toBeNull();
  });

  it('returns null for malformed saves instead of throwing', () => {
    expect(migrateLoadedGameState(null)).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: null, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [{}], factions: { f1: null }, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [null], factions: {}, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, seed: 1, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
  });

  it('returns null when migrated seats are empty', () => {
    const state = initialState(mkConfig());
    const legacy = { ...state, seats: [] };
    expect(migrateLoadedGameState(legacy)).toBeNull();
  });

  it('returns null when all seats are empty', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: state.seats.map((seat) => ({ ...seat, kind: 'empty' })),
    };
    expect(migrateLoadedGameState(legacy)).toBeNull();
  });

  it('returns null when only one active seat remains after migration', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
      seats: [
        { ...state.seats[0], kind: 'human' },
        { ...state.seats[1], kind: 'empty' },
      ],
    };
    expect(migrateLoadedGameState(legacy)).toBeNull();
  });
});

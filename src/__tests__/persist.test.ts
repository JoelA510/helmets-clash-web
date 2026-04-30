import { describe, expect, it } from 'vitest';
import { FACTION_PRESETS } from '../game/constants';
import { migrateLoadedGameState } from '../game/persist';
import { initialState } from '../game/state';
import { mkConfig } from './helpers';

describe('persist migration/hydration', () => {
  it('loads current serialized saves unchanged and rehydrates sets', () => {
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

  it('fills missing seat.factionPresetId via legacy active-seat order fallback', () => {
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

  it('filters empty seats from migrated runtime seats while preserving active seat presets', () => {
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

  it('backfills missing idx/factionId for active seats deterministically', () => {
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

  it('returns null when migrated seats reference factions missing from migrated factions', () => {
    const state = initialState(mkConfig());
    const legacy = {
      ...state,
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
    expect(migrated).toBeNull();
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

  it('migrates config.seats preset ids and reconstructs config.seats when missing', () => {
    const state = initialState(mkConfig());
    const legacyWithConfigSeats = {
      ...state,
      config: {
        ...state.config,
        seats: state.config.seats.map((seat) => {
          const { factionPresetId, ...rest } = seat;
          void factionPresetId;
          return rest;
        }),
      },
    };
    const migratedWithConfigSeats = migrateLoadedGameState(legacyWithConfigSeats);
    expect(migratedWithConfigSeats).toBeTruthy();
    expect(
      migratedWithConfigSeats?.config.seats.every((seat) => FACTION_PRESETS.some((p) => p.id === seat.factionPresetId)),
    ).toBe(true);

    const { seats: _legacyConfigSeats, ...legacyConfigNoSeats } = state.config;
    void _legacyConfigSeats;
    const legacyWithoutConfigSeats = { ...state, config: legacyConfigNoSeats };
    const migratedWithoutConfigSeats = migrateLoadedGameState(legacyWithoutConfigSeats);
    expect(migratedWithoutConfigSeats).toBeTruthy();
    expect(migratedWithoutConfigSeats?.config.seats).toHaveLength(state.seats.length);
    expect(migratedWithoutConfigSeats?.config.seats[0].factionPresetId).toBe(state.seats[0].factionPresetId);
  });

  it('returns null for malformed saves instead of throwing', () => {
    expect(migrateLoadedGameState(null)).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: null, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [{}], factions: { f1: null }, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [null], factions: {}, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, seed: 1, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, seed: 1, activeSeatIdx: 0, status: 'paused' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, config: {}, turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, config: {}, cities: [], turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, config: {}, cities: [], units: [], turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: {}, map: {}, config: {}, cities: [], units: [], log: [], mapCols: 5, turn: 1, seed: 1, activeSeatIdx: 0, status: 'playing' })).toBeNull();
    expect(migrateLoadedGameState({ ...initialState(mkConfig()), config: { seats: 'bad' } })).toBeNull();
  });
});

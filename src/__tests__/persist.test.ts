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

  it('returns null for malformed saves instead of throwing', () => {
    expect(migrateLoadedGameState(null)).toBeNull();
    expect(migrateLoadedGameState({ seats: [], factions: null, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [{}], factions: { f1: null }, map: {} })).toBeNull();
    expect(migrateLoadedGameState({ seats: [null], factions: {}, map: {} })).toBeNull();
  });
});

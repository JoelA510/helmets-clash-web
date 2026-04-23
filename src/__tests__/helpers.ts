import type { FactionId, FactionState, GameConfig, GameState } from '../game/types';

// Deep-ish clone that preserves Sets inside faction sub-objects. JSON
// round-tripping would otherwise turn Sets into {}.
export const cloneState = (s: GameState): GameState => {
  const factions = {} as GameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, FactionState]>) {
    factions[k] = {
      ...v,
      buildings: new Set(v.buildings),
      explored: new Set(v.explored),
      hand: [...v.hand],
      deck: [...v.deck],
      discard: [...v.discard],
    };
  }
  return {
    ...s,
    factions,
    units: s.units.map((u) => ({ ...u })),
    cities: s.cities.map((c) => ({ ...c })),
    log: [...s.log],
  };
};

// Minimal typed factory for tests so the literal-widening dance is done
// once. Every test-only GameConfig flows through this so adding a new
// required field to the type can't silently break a test helper.
export const mkConfig = (partial: Partial<GameConfig> = {}): GameConfig => ({
  mapSize: 'small',
  mapType: 'pangaea',
  seed: 42,
  seats: [
    { kind: 'human', name: 'P1' },
    { kind: 'human', name: 'P2' },
    { kind: 'empty', name: '' },
    { kind: 'empty', name: '' },
  ],
  ...partial,
});

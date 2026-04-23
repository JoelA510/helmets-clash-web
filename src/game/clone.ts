import type { FactionId, GameState } from './types';

// Shallow-clone game state preserving the Sets inside faction sub-objects
// (buildings, explored) and the hand/deck/discard arrays so callers can
// mutate the returned copy without touching the original reference. Used
// by the reducer and by tests; kept in one place so the "what's a full
// clone" knowledge doesn't drift between sites.
export const cloneGameState = (s: GameState): GameState => {
  const factions = {} as GameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, GameState['factions'][FactionId]]>) {
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

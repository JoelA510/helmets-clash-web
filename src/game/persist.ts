import type { FactionId, FactionState, GameState } from './types';

// localStorage key for the single autosave slot. Single slot is intentional:
// the game is short enough that multiple saves add UI surface without a
// clear win. Migrating to keyed slots later is a one-field change.
const STORAGE_KEY = 'helmets-clash:save:v1';

// Sets don't survive JSON.stringify, so replace them with arrays on save
// and rehydrate on load. Everything else in GameState is already JSON-safe
// (primitives, plain objects, arrays).
type SerializableFactionState = Omit<FactionState, 'buildings' | 'explored'> & {
  buildings: string[];
  explored: string[];
};
type SerializableGameState = Omit<GameState, 'factions'> & {
  factions: Record<FactionId, SerializableFactionState>;
};

const toSerializable = (s: GameState): SerializableGameState => {
  const factions = {} as SerializableGameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, FactionState]>) {
    factions[k] = {
      ...v,
      buildings: Array.from(v.buildings),
      explored: Array.from(v.explored),
    };
  }
  return { ...s, factions };
};

const fromSerializable = (s: SerializableGameState): GameState => {
  const factions = {} as GameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, SerializableFactionState]>) {
    factions[k] = {
      ...v,
      buildings: new Set(v.buildings),
      explored: new Set(v.explored),
    } as FactionState;
  }
  return { ...s, factions } as GameState;
};

export const saveGame = (state: GameState): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = toSerializable(state);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or serialization error — silently drop. The user can
    // still play the live session; saves just won't persist.
  }
};

export const loadGame = (): GameState | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializableGameState;
    // Minimal shape check — malformed saves just get discarded rather than
    // crashing the app.
    if (!parsed || !parsed.seats || !parsed.factions || !parsed.map) return null;
    return fromSerializable(parsed);
  } catch {
    return null;
  }
};

export const clearSave = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const hasSave = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

import { FACTION_PRESETS } from '../game/constants';
import type { GameConfig } from '../game/types';
import { cloneGameState } from '../game/clone';

// Re-export under the historical name used by the test suite. The test
// files were written against `cloneState`; leave that working while
// centralizing the implementation in src/game/clone.ts.
export const cloneState = cloneGameState;

// Minimal typed factory for tests so the literal-widening dance is done
// once. Every test-only GameConfig flows through this so adding a new
// required field to the type can't silently break a test helper.
export const mkConfig = (partial: Partial<GameConfig> = {}): GameConfig => ({
  mapSize: 'small',
  mapType: 'pangaea',
  seed: 42,
  seats: [
    { kind: 'human', name: 'P1', factionPresetId: FACTION_PRESETS[0].id },
    { kind: 'human', name: 'P2', factionPresetId: FACTION_PRESETS[1].id },
    { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[2].id },
    { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[3].id },
  ],
  ...partial,
});

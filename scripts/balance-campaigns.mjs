// Run from the repository root. Each JSON line describes one complete trial.
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
try {
  const {createOpeningPosition} = await vite.ssrLoadModule('/src/game/state.ts');
  const {turnIncome} = await vite.ssrLoadModule('/src/game/turn.ts');
  const {play, swapMirrorSpawns} = await vite.ssrLoadModule('/scripts/balance-pairs.ts');
  const {screens, raiderRace, siege} = await vite.ssrLoadModule('/scripts/balance-scenarios.ts');
  for (const first of ['f1', 'f2']) {
    for (const terrain of ['grass', 'forest']) for (const reverse of [false, true]) {
      console.log(JSON.stringify({trial:'screens', first, terrain, reverse, ...screens(first, terrain, reverse)}));
    }
    console.log(JSON.stringify({trial:'race', first, ...raiderRace(first)}));
  }
  for (const response of ['none', 'garrison', 'sortie', 'combined']) {
    console.log(JSON.stringify({trial:'siege', ...siege(response)}));
  }

  for (const start of [201, 401]) for (let seed = start; seed < start + 16; seed++) {
    for (const mapType of ['continents', 'highlands']) {
      for (const presets of [['aldermere','sunspire'], ['aldermere','grimhold'], ['grimhold','aldermere']]) {
        const seats = presets.map(name => ({kind:'ai', name, factionPresetId:name}));
        const base = createOpeningPosition({seed, mapSize:'medium', mapType, seats});
        const mirror = !presets.includes('grimhold');
        for (const swapped of mirror ? [false, true] : [false]) {
          const opening = structuredClone(base);
          if (swapped) swapMirrorSpawns(opening);
          const income = seats.map((_, i) => {
            const {goldGain, foodGain} = turnIncome(opening, opening.factions[opening.seats[i].factionId]);
            return [goldGain, foodGain];
          });
          for (const first of ['f1', 'f2']) {
            console.log(JSON.stringify({trial:'campaign', start, seed, mapType, presets, swapped, first, income, ...play(opening, first)}));
          }
        }
      }
    }
  }
} finally {
  await vite.close();
}

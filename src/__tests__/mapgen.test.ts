import { describe, expect, it } from 'vitest';
import { generateMap, finalizeMap, placeSpawns } from '../game/mapgen';
import { mulberry32 } from '../game/rng';
import { TERRAIN } from '../game/constants';
import { hexKey, neighbors } from '../game/hex';
import type { HexKey, MapSizeId, MapTypeId, TileMap } from '../game/types';

// Flood-fill helper used only by this test suite. Lives here instead of
// leaking from the mapgen public API.
const reachable = (tiles: TileMap, q: number, r: number): Set<HexKey> => {
  const start = hexKey(q, r);
  const seen = new Set<HexKey>([start]);
  const stack: Array<{ q: number; r: number }> = [{ q, r }];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighbors(cur.q, cur.r)) {
      const k = hexKey(n.q, n.r);
      if (seen.has(k)) continue;
      const t = tiles[k];
      if (!t || !TERRAIN[t.type].passable) continue;
      seen.add(k);
      stack.push(n);
    }
  }
  return seen;
};

describe('mapgen connectivity guarantee', () => {
  const sizes: MapSizeId[] = ['small', 'medium', 'large', 'huge'];
  const types: MapTypeId[] = ['continents', 'islands', 'pangaea', 'highlands', 'random'];
  const seatCounts = [2, 3, 4];

  for (const mapSize of sizes) {
    for (const mapType of types) {
      for (const seats of seatCounts) {
        it(`${mapSize}/${mapType}/${seats} seats — all spawns connected`, () => {
          for (let i = 0; i < 3; i++) {
            const seed = (mapSize.charCodeAt(0) * 1000 + i) ^ (seats * 31);
            const { tiles, cols, rows } = generateMap({ mapSize, mapType, seed });
            const rng = mulberry32(seed ^ 0x9e3779b9);
            const spawns = placeSpawns(tiles, seats, cols, rows, rng);
            finalizeMap(tiles, spawns);

            for (const s of spawns) {
              const t = tiles[hexKey(s.q, s.r)];
              expect(t).toBeDefined();
              expect(TERRAIN[t.type].passable).toBe(true);
            }
            const root = reachable(tiles, spawns[0].q, spawns[0].r);
            for (const s of spawns) {
              expect(root.has(hexKey(s.q, s.r))).toBe(true);
            }
          }
        });
      }
    }
  }
});

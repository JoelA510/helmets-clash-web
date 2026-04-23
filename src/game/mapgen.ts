import type { Hex, HexKey, MapSizeId, MapTypeId, Tile, TileMap, TerrainType } from './types';
import { MAP_SIZES, MAP_TYPES, TERRAIN } from './constants';
import { hexKey, neighbors, parseKey, hexDistance } from './hex';
import { mulberry32, type RNG } from './rng';

// Iterate every axial coordinate that exists on the map grid.
const forEachCoord = (cols: number, rows: number, fn: (q: number, r: number) => void): void => {
  for (let r = 0; r < rows; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < cols - rOffset; q++) {
      fn(q, r);
    }
  }
};

type NoiseFn = (q: number, r: number) => number;

// Value-noise field keyed by hex coord. Smoothed by averaging with ring-1
// neighbors so biomes cluster instead of being pure white noise.
const makeNoise = (rng: RNG): NoiseFn => {
  const cache = new Map<HexKey, number>();
  const hash = (q: number, r: number): number => {
    const k = hexKey(q, r);
    let v = cache.get(k);
    if (v === undefined) { v = rng(); cache.set(k, v); }
    return v;
  };
  return (q, r) => {
    let sum = hash(q, r) * 2;
    let count = 2;
    for (const n of neighbors(q, r)) { sum += hash(n.q, n.r); count += 1; }
    return sum / count;
  };
};

type TerrainGen = (q: number, r: number, cols: number, rows: number, rng: RNG, noise: NoiseFn) => TerrainType;

const terrainFor: Record<Exclude<MapTypeId, 'random'>, TerrainGen> = {
  continents(q, r, cols, rows, rng, noise) {
    const cx = (cols - Math.floor(r / 2)) / 2 - 0.5;
    const cy = rows / 2;
    const dx = (q + r / 2) - cx, dy = r - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(cols, rows);
    const n = noise(q, r);
    // High dist (edges) + low noise pushes toward coast/water. Inland uses a
    // second roll for terrain variety.
    const landiness = n - dist * 0.8;
    if (landiness < -0.15) return 'water';
    if (landiness < -0.02) return 'coast';
    const roll = rng();
    if (roll < 0.08) return 'mountain';
    if (roll < 0.22) return 'forest';
    if (roll < 0.33) return 'hills';
    return 'grass';
  },
  islands(q, r, _cols, _rows, rng, noise) {
    const n = noise(q, r);
    if (n < 0.42) return 'water';
    if (n < 0.5) return 'coast';
    const roll = rng();
    if (roll < 0.08) return 'mountain';
    if (roll < 0.24) return 'forest';
    if (roll < 0.36) return 'hills';
    return 'grass';
  },
  pangaea(q, r, cols, rows, rng) {
    const cx = (cols - Math.floor(r / 2)) / 2 - 0.5;
    const cy = rows / 2;
    const dx = (q + r / 2) - cx, dy = r - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(cols, rows);
    // Only the far edges ever dip below the land threshold.
    if (dist > 0.52 && rng() < 0.4) return rng() < 0.3 ? 'water' : 'coast';
    const roll = rng();
    if (roll < 0.07) return 'mountain';
    if (roll < 0.22) return 'forest';
    if (roll < 0.34) return 'hills';
    return 'grass';
  },
  highlands(q, r, _cols, _rows, rng, noise) {
    const n = noise(q, r);
    // Noise-driven mountain ranges with valleys of grass/hills between.
    if (n > 0.68) return 'mountain';
    if (n > 0.55) return 'hills';
    if (n > 0.35) return rng() < 0.3 ? 'forest' : 'grass';
    return rng() < 0.15 ? 'coast' : 'grass';
  },
};

// --- Connectivity ---

// Flood fill returning the set of passable keys reachable from (q,r).
const reachableFrom = (tiles: TileMap, q: number, r: number): Set<HexKey> => {
  const start = hexKey(q, r);
  const seen = new Set<HexKey>();
  if (!tiles[start] || !TERRAIN[tiles[start].type].passable) return seen;
  seen.add(start);
  const stack: Hex[] = [{ q, r }];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of neighbors(cur.q, cur.r)) {
      const k = hexKey(nb.q, nb.r);
      if (seen.has(k)) continue;
      const t = tiles[k];
      if (!t || !TERRAIN[t.type].passable) continue;
      seen.add(k);
      stack.push(nb);
    }
  }
  return seen;
};

// Cost for Dijkstra corridor carving. Land is cheap; water is medium;
// mountain is expensive but still traversable by the carver (which will
// convert impassable tiles it walks through into passable ones).
const carveCost = (type: TerrainType | undefined): number => {
  if (!type) return Infinity;
  if (type === 'mountain') return 8;
  if (type === 'water') return 4;
  if (type === 'coast') return 1;
  if (type === 'hills') return 0.5;
  if (type === 'forest') return 0.5;
  return 0.2; // grass
};

// --- Binary min-heap for Dijkstra. Keeps the frontier ordered by cost in
// O(log n) per push/pop vs. the previous O(n log n) re-sort-on-every-pop
// approach. Used only by mapgen's corridor carver. ---

type HeapNode = { k: HexKey; d: number };

class MinHeap {
  private heap: HeapNode[] = [];
  get size(): number { return this.heap.length; }
  push(node: HeapNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }
  pop(): HeapNode | undefined {
    if (!this.heap.length) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }
  private bubbleUp(i: number): void {
    const node = this.heap[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].d <= node.d) break;
      this.heap[i] = this.heap[parent];
      i = parent;
    }
    this.heap[i] = node;
  }
  private sinkDown(i: number): void {
    const n = this.heap.length;
    const node = this.heap[i];
    // Classic sinkDown: move smaller children up until `node` finds its
    // slot, then place `node` once at the end. One assign per level.
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.heap[l].d < this.heap[smallest].d) smallest = l;
      if (r < n && this.heap[r].d < this.heap[smallest].d) smallest = r;
      if (smallest === i) break;
      this.heap[i] = this.heap[smallest];
      i = smallest;
    }
    this.heap[i] = node;
  }
}

// Dijkstra from every tile in sourceSet to any tile in destSet. Returns the
// cheapest path as an ordered list of tile keys (destination first reached,
// walking back to the source), or null if no connection exists.
const cheapestPath = (tiles: TileMap, sourceSet: Set<HexKey>, destSet: Set<HexKey>): HexKey[] | null => {
  const dist = new Map<HexKey, number>();
  const prev = new Map<HexKey, HexKey>();
  const heap = new MinHeap();
  for (const k of sourceSet) {
    dist.set(k, 0);
    heap.push({ k, d: 0 });
  }
  let found: HexKey | null = null;
  while (heap.size) {
    const { k, d } = heap.pop()!;
    if (d > (dist.get(k) ?? Infinity)) continue;
    if (destSet.has(k)) { found = k; break; }
    const { q, r } = parseKey(k);
    for (const nb of neighbors(q, r)) {
      const nk = hexKey(nb.q, nb.r);
      const t = tiles[nk];
      if (!t) continue;
      const step = carveCost(t.type);
      const nd = d + step;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, k);
        heap.push({ k: nk, d: nd });
      }
    }
  }
  if (!found) return null;
  const path: HexKey[] = [];
  let cur: HexKey | undefined = found;
  while (cur && !sourceSet.has(cur)) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return path;
};

// Convert any impassable tiles on the corridor to hills so every spawn can
// reach every other by land. Preserves coastline: water tiles on the
// corridor become coast (passable) rather than hills, which keeps the map
// visually plausible for islands/continents.
const carveCorridor = (tiles: TileMap, path: HexKey[]): void => {
  for (const k of path) {
    const t = tiles[k];
    if (!t) continue;
    if (TERRAIN[t.type].passable) continue;
    t.type = t.type === 'water' ? 'coast' : 'hills';
  }
};

// Given the map and a list of spawn coords, guarantee every spawn is in the
// same connected component of passable tiles. Runs at most N-1 carve passes.
const ensureSpawnConnectivity = (tiles: TileMap, spawns: Hex[]): void => {
  if (spawns.length < 2) return;
  // Force each spawn tile to grassland first so the spawn itself isn't blocked.
  for (const s of spawns) {
    const k = hexKey(s.q, s.r);
    if (tiles[k]) tiles[k].type = 'grass';
  }
  let guard = 8;
  while (guard-- > 0) {
    const root = reachableFrom(tiles, spawns[0].q, spawns[0].r);
    const disconnected = spawns.find((s) => !root.has(hexKey(s.q, s.r)));
    if (!disconnected) return;
    const target = reachableFrom(tiles, disconnected.q, disconnected.r);
    const path = cheapestPath(tiles, root, target);
    if (!path || !path.length) {
      bruteCarve(tiles, spawns[0], disconnected);
      continue;
    }
    carveCorridor(tiles, path);
  }
};

// Greedy fallback: step toward b, flipping whatever is in the way. Only
// runs if Dijkstra somehow fails to find a bridge (e.g. the target region
// is a single isolated tile of the map and every neighbor is the map edge).
const bruteCarve = (tiles: TileMap, a: Hex, b: Hex): void => {
  let cur = { q: a.q, r: a.r };
  let safety = 200;
  while ((cur.q !== b.q || cur.r !== b.r) && safety-- > 0) {
    const best = neighbors(cur.q, cur.r)
      .map((n) => ({ n, d: hexDistance(n, b) }))
      .sort((x, y) => x.d - y.d)[0];
    if (!best) break;
    cur = best.n;
    const k = hexKey(cur.q, cur.r);
    if (tiles[k] && !TERRAIN[tiles[k].type].passable) {
      tiles[k].type = tiles[k].type === 'water' ? 'coast' : 'hills';
    }
  }
};

// --- Spawn placement ---

// Pick N start hexes that are roughly equidistant from each other, on land,
// with a 1-tile buffer from map edges. Uses farthest-point sampling.
export const placeSpawns = (tiles: TileMap, count: number, cols: number, rows: number, rng: RNG): Hex[] => {
  const candidates: Hex[] = [];
  forEachCoord(cols, rows, (q, r) => {
    const t = tiles[hexKey(q, r)];
    if (!t || !TERRAIN[t.type].passable) return;
    const rOff = Math.floor(r / 2);
    if (q < -rOff + 1 || q > cols - rOff - 2) return;
    if (r < 1 || r > rows - 2) return;
    candidates.push({ q, r });
  });
  if (candidates.length === 0) {
    return Array.from({ length: count }, (_, i) => {
      const q = i % 2 === 0 ? 0 : cols - 2;
      const r = i < 2 ? 0 : rows - 1;
      return { q: q - Math.floor(r / 2), r };
    }).slice(0, count);
  }

  const picked: Hex[] = [];
  picked.push(candidates[Math.floor(rng() * candidates.length)]);

  while (picked.length < count) {
    let best: Hex | null = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      if (picked.some((p) => p.q === c.q && p.r === c.r)) continue;
      let minD = Infinity;
      for (const p of picked) {
        const d = hexDistance(c, p);
        if (d < minD) minD = d;
      }
      if (minD > bestScore) { bestScore = minD; best = c; }
    }
    if (!best) break;
    picked.push(best);
  }
  return picked;
};

// --- Public entry point ---

export type GeneratedMap = {
  tiles: TileMap;
  cols: number;
  rows: number;
  resolvedType: Exclude<MapTypeId, 'random'>;
};

type GenerateConfig = {
  mapSize: MapSizeId;
  mapType: MapTypeId;
  seed?: number;
};

export const generateMap = (config: GenerateConfig): GeneratedMap => {
  const size = MAP_SIZES[config.mapSize] || MAP_SIZES.medium;
  let type: MapTypeId = config.mapType;
  if (!type || type === 'random' || !MAP_TYPES[type]) {
    const keys = (Object.keys(MAP_TYPES) as MapTypeId[]).filter((k) => k !== 'random');
    type = keys[(config.seed ?? Date.now()) % keys.length];
  }
  const seed = (config.seed ?? Date.now()) & 0xffffffff;
  const rng = mulberry32(seed);
  const noise = makeNoise(rng);
  const tiles: TileMap = {};
  const gen = terrainFor[type as Exclude<MapTypeId, 'random'>] ?? terrainFor.continents;
  forEachCoord(size.cols, size.rows, (q, r) => {
    tiles[hexKey(q, r)] = { q, r, type: gen(q, r, size.cols, size.rows, rng, noise) };
  });
  return { tiles, cols: size.cols, rows: size.rows, resolvedType: type as Exclude<MapTypeId, 'random'> };
};

export const finalizeMap = (tiles: TileMap, spawns: Hex[]): void => {
  ensureSpawnConnectivity(tiles, spawns);
};

export type { Tile };

// @ts-nocheck
import { TERRAIN, MAP_SIZES, MAP_TYPES } from './constants';
import { hexKey, neighbors, parseKey, hexDistance } from './hex';
import { mulberry32 } from './rng';

// Iterate every axial coordinate that exists on the map grid.
const forEachCoord = (cols, rows, fn) => {
  for (let r = 0; r < rows; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < cols - rOffset; q++) {
      fn(q, r);
    }
  }
};

// Simple value-noise field keyed by hex coord. Returns a function noise(q,r) in [0,1).
const makeNoise = (rng) => {
  const cache = new Map();
  const hash = (q, r) => {
    const k = hexKey(q, r);
    let v = cache.get(k);
    if (v === undefined) { v = rng(); cache.set(k, v); }
    return v;
  };
  // Smooth by averaging with ring-1 neighbors so biomes cluster instead of
  // being pure white noise.
  return (q, r) => {
    let sum = hash(q, r) * 2;
    let count = 2;
    for (const n of neighbors(q, r)) { sum += hash(n.q, n.r); count += 1; }
    return sum / count;
  };
};

const terrainFor = {
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
const reachableFrom = (tiles, q, r) => {
  const start = hexKey(q, r);
  const seen = new Set();
  if (!tiles[start] || !TERRAIN[tiles[start].type].passable) return seen;
  seen.add(start);
  const stack = [{ q, r }];
  while (stack.length) {
    const cur = stack.pop();
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

// Cost grid for carving a corridor between two disconnected regions. Land is
// cheap; water is medium; mountain is expensive (but still passable to the
// carver, which will convert it to hills).
const carveCost = (type) => {
  if (!type) return Infinity;
  if (type === 'mountain') return 8;
  if (type === 'water') return 4;
  if (type === 'coast') return 1;
  if (type === 'hills') return 0.5;
  if (type === 'forest') return 0.5;
  return 0.2; // grass
};

// Dijkstra from every tile in sourceSet to any tile in destSet. Returns the
// cheapest path as an ordered list of tile coords, or null if no tiles exist.
const cheapestPath = (tiles, sourceSet, destSet) => {
  const dist = new Map();
  const prev = new Map();
  const queue = [];
  for (const k of sourceSet) {
    dist.set(k, 0);
    queue.push({ k, d: 0 });
  }
  let found = null;
  // Small-N Dijkstra with array sort; acceptable for <500 tiles.
  while (queue.length) {
    queue.sort((a, b) => a.d - b.d);
    const { k, d } = queue.shift();
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
        queue.push({ k: nk, d: nd });
      }
    }
  }
  if (!found) return null;
  const path = [];
  let cur = found;
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
const carveCorridor = (tiles, path) => {
  for (const k of path) {
    const t = tiles[k];
    if (!t) continue;
    if (TERRAIN[t.type].passable) continue;
    t.type = t.type === 'water' ? 'coast' : 'hills';
  }
};

// Given the map and a list of spawn coords, guarantee every spawn is in the
// same connected component of passable tiles. Runs at most N-1 carve passes.
const ensureSpawnConnectivity = (tiles, spawns) => {
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
      // As a last resort, turn the straight-line interpolation into land.
      bruteCarve(tiles, spawns[0], disconnected);
      continue;
    }
    carveCorridor(tiles, path);
  }
};

// Fallback: walk from a to b one hex at a time, flipping anything impassable.
const bruteCarve = (tiles, a, b) => {
  let cur = { q: a.q, r: a.r };
  let safety = 200;
  while ((cur.q !== b.q || cur.r !== b.r) && safety-- > 0) {
    // Step toward b along whichever axial direction most reduces distance.
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
// with some buffer from map edges. Uses farthest-point sampling.
export const placeSpawns = (tiles, count, cols, rows, rng) => {
  const candidates = [];
  forEachCoord(cols, rows, (q, r) => {
    const t = tiles[hexKey(q, r)];
    if (!t || !TERRAIN[t.type].passable) return;
    const rOff = Math.floor(r / 2);
    if (q < -rOff + 1 || q > cols - rOff - 2) return; // 1-tile edge buffer
    if (r < 1 || r > rows - 2) return;
    candidates.push({ q, r });
  });
  if (candidates.length === 0) {
    // Fallback to map corners if somehow no candidates survived.
    return Array.from({ length: count }, (_, i) => {
      const q = i % 2 === 0 ? 0 : cols - 2;
      const r = i < 2 ? 0 : rows - 1;
      return { q: q - Math.floor(r / 2), r };
    }).slice(0, count);
  }

  const picked = [];
  // Seed with a random candidate to avoid deterministic top-left bias.
  picked.push(candidates[Math.floor(rng() * candidates.length)]);

  while (picked.length < count) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      if (picked.some((p) => p.q === c.q && p.r === c.r)) continue;
      // Score = distance to nearest already-picked spawn.
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

export const generateMap = (config) => {
  const size = MAP_SIZES[config.mapSize] || MAP_SIZES.medium;
  let type = config.mapType;
  if (!type || type === 'random' || !MAP_TYPES[type]) {
    const keys = Object.keys(MAP_TYPES).filter((k) => k !== 'random');
    type = keys[Math.floor((config.seed ?? Date.now()) % keys.length)];
  }
  const seed = (config.seed ?? Date.now()) & 0xffffffff;
  const rng = mulberry32(seed);
  const noise = makeNoise(rng);
  const tiles = {};
  const gen = terrainFor[type] || terrainFor.continents;
  forEachCoord(size.cols, size.rows, (q, r) => {
    tiles[hexKey(q, r)] = { q, r, type: gen(q, r, size.cols, size.rows, rng, noise) };
  });
  return { tiles, cols: size.cols, rows: size.rows, resolvedType: type };
};

// Finalize the map by carving required corridors so every spawn is
// reachable. Separate step so callers can pick spawns first.
export const finalizeMap = (tiles, spawns) => {
  ensureSpawnConnectivity(tiles, spawns);
};

// @ts-nocheck
export const HEX_SIZE = 30;
export const SQRT3 = Math.sqrt(3);

export const hexToPixel = (q, r) => ({
  x: HEX_SIZE * SQRT3 * (q + r / 2),
  y: HEX_SIZE * 1.5 * r,
});

export const hexDistance = (a, b) =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

export const HEX_DIRS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export const neighbors = (q, r) => HEX_DIRS.map((d) => ({ q: q + d.q, r: r + d.r }));

export const hexKey = (q, r) => `${q},${r}`;
export const parseKey = (k) => { const [q, r] = k.split(',').map(Number); return { q, r }; };

export const hexPoints = (cx, cy, size = HEX_SIZE) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
};

// Arrow-key directional steps on an axial hex grid (pointy-top):
// Up/Down move along the r axis; Left/Right along q; diagonals use the
// remaining two of the six hex directions.
export const HEX_NAV = {
  ArrowRight: { q: 1, r: 0 },
  ArrowLeft: { q: -1, r: 0 },
  ArrowUp: { q: 0, r: -1 },
  ArrowDown: { q: 0, r: 1 },
  // Diagonal steps for keyboard users on numpad-style nav
  PageUp: { q: 1, r: -1 },
  PageDown: { q: -1, r: 1 },
};

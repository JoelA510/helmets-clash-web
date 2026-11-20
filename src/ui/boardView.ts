import { HEX_SIZE, hexToPixel } from '../game/hex';
import type { TileMap } from '../game/types';

export function boardBounds(map: TileMap) {
  const points = Object.values(map).map(t => hexToPixel(t.q, t.r));
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const pad = HEX_SIZE + 10;
  const left = Math.min(...xs) - pad, top = Math.min(...ys) - pad;
  return { left, top, width: Math.max(...xs) + pad - left, height: Math.max(...ys) + pad - top };
}

export function boardView(bounds: ReturnType<typeof boardBounds>, zoom: number, pan: { x: number; y: number }) {
  const width = bounds.width / zoom, height = bounds.height / zoom;
  const dx = (bounds.width - width) / 2, dy = (bounds.height - height) / 2;
  const x = Math.max(-dx, Math.min(dx, pan.x)), y = Math.max(-dy, Math.min(dy, pan.y));
  return { left: bounds.left + dx + x, top: bounds.top + dy + y, width, height, pan: { x, y } };
}

export function centeredPan(bounds: ReturnType<typeof boardBounds>, zoom: number, hex: { q: number; r: number }) {
  const point = hexToPixel(hex.q, hex.r);
  return boardView(bounds, zoom, { x: point.x - bounds.left - bounds.width / 2,
    y: point.y - bounds.top - bounds.height / 2 }).pan;
}

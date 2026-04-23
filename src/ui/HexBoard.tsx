import type { RefObject } from 'react';
import type { AttackTarget, FactionId, GameState, Hex, HexKey } from '../game/types';
import { TERRAIN, UNIT_TYPES } from '../game/constants';
import { HEX_SIZE, hexKey, hexPoints, hexToPixel, parseKey } from '../game/hex';
import { FactionPatterns } from './FactionPatterns';

type HexBoardProps = {
  state: GameState;
  viewerFactionId: FactionId;
  selectedUnit: number | null;
  hoveredHex: HexKey | null;
  setHoveredHex: (k: HexKey | null) => void;
  cursor: Hex;
  setCursor: (c: Hex) => void;
  onHexActivate: (q: number, r: number) => void;
  moveRange: Map<HexKey, number>;
  attackTargets: AttackTarget[];
  recentlyDamaged: Record<string, number>;
  reducedMotion: boolean;
  boardRef: RefObject<SVGSVGElement | null>;
};

// Renders the SVG hex board for the current viewing faction, applying fog
// of war (only tiles in `explored` render at full visibility). Also renders
// units, cities, and overlays for move-range, attack-targets, targeting,
// the selected unit, and the keyboard cursor.
export function HexBoard({
  state, viewerFactionId, selectedUnit, hoveredHex, setHoveredHex,
  cursor, setCursor, onHexActivate, moveRange, attackTargets,
  recentlyDamaged, reducedMotion, boardRef,
}: HexBoardProps) {
  const explored = state.factions[viewerFactionId]?.explored ?? new Set<HexKey>();
  const keys = Object.keys(state.map);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const key of keys) {
    const { q, r } = parseKey(key);
    const { x, y } = hexToPixel(q, r);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const pad = HEX_SIZE + 10;
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

  const cursorKey = cursor ? hexKey(cursor.q, cursor.r) : null;

  return (
    <svg
      ref={boardRef}
      viewBox={viewBox}
      role="application"
      aria-label="Hex battle map. Use arrow keys to move the cursor, Enter to select or act, Escape to cancel."
      tabIndex={0}
      className="w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500 rounded"
      style={{ maxHeight: '70vh' }}
    >
      <FactionPatterns />
      {keys.map((key) => {
        const { q, r } = parseKey(key);
        const tile = state.map[key];
        const { x, y } = hexToPixel(q, r);
        const terrain = TERRAIN[tile.type];
        const isExplored = explored.has(key);
        const isMoveHex = moveRange.has(key);
        const isAttackHex = attackTargets.some((t) => t.target.q === q && t.target.r === r);
        const isHovered = hoveredHex === key;
        const isCursor = cursorKey === key;
        const isTargeting = !!state.targeting;

        return (
          <g key={key} transform={`translate(${x}, ${y})`}>
            <polygon
              points={hexPoints(0, 0)}
              fill={isExplored ? terrain.color : '#4a4a4a'}
              stroke={isCursor ? '#ffffff' : isHovered ? '#ffd700' : terrain.edge}
              strokeWidth={isCursor ? 3.5 : isHovered ? 2.5 : 1}
              opacity={isExplored ? 1 : 0.55}
              onClick={() => { setCursor({ q, r }); onHexActivate(q, r); }}
              onMouseEnter={() => setHoveredHex(key)}
              onMouseLeave={() => setHoveredHex(null)}
              style={{ cursor: 'pointer', transition: reducedMotion ? 'none' : 'stroke 0.15s' }}
              aria-hidden="true"
            />
            {/* Terrain glyphs add non-color cues for passability/feature. */}
            {isExplored && tile.type === 'forest' && <text x={0} y={4} textAnchor="middle" fontSize={18} opacity={0.75} pointerEvents="none">🌲</text>}
            {isExplored && tile.type === 'mountain' && <text x={0} y={5} textAnchor="middle" fontSize={20} opacity={0.9} pointerEvents="none">⛰</text>}
            {isExplored && tile.type === 'hills' && <text x={0} y={5} textAnchor="middle" fontSize={14} opacity={0.7} pointerEvents="none">⛰</text>}
            {isExplored && tile.type === 'water' && <text x={0} y={4} textAnchor="middle" fontSize={14} opacity={0.8} pointerEvents="none">〰</text>}
            {isExplored && tile.type === 'coast' && <text x={0} y={4} textAnchor="middle" fontSize={12} opacity={0.6} pointerEvents="none">~</text>}

            {isMoveHex && !isAttackHex && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#2563eb" opacity={0.32} pointerEvents="none" />
            )}
            {isAttackHex && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#dc2626" opacity={reducedMotion ? 0.5 : 0.4} pointerEvents="none">
                {!reducedMotion && <animate attributeName="opacity" values="0.3;0.55;0.3" dur="1s" repeatCount="indefinite" />}
              </polygon>
            )}
            {isTargeting && isExplored && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#6366f1" opacity={0.18} pointerEvents="none" />
            )}
          </g>
        );
      })}

      {state.cities.map((city) => {
        const isOwn = city.faction === viewerFactionId;
        if (!isOwn && !explored.has(hexKey(city.q, city.r))) return null;
        const { x, y } = hexToPixel(city.q, city.r);
        const faction = state.factions[city.faction];
        const damaged = !reducedMotion && (recentlyDamaged[`city-${city.name}`] || recentlyDamaged[city.id]);
        return (
          <g key={`city-${city.id}`} transform={`translate(${x}, ${y})`} pointerEvents="none"
             role="img"
             aria-label={`${faction?.displayName || city.faction} city ${city.name}, health ${city.hp} of ${city.maxHp}`}>
            <rect x={-18} y={-18} width={36} height={32} rx={3}
              fill={faction ? `url(#pattern-${faction.id})` : '#888'}
              stroke={faction?.accent || '#333'} strokeWidth={2.5}
              opacity={damaged ? 0.5 : 1} />
            <rect x={-14} y={-14} width={6} height={8} fill={faction?.accent || '#333'} />
            <rect x={-4} y={-14} width={6} height={8} fill={faction?.accent || '#333'} />
            <rect x={8} y={-14} width={6} height={8} fill={faction?.accent || '#333'} />
            <text x={0} y={6} textAnchor="middle" fontSize={14} fontWeight="bold"
              fill={faction?.accent || '#111'}>{faction?.glyph || '♔'}</text>
            <rect x={-18} y={16} width={36} height={4} fill="#333" />
            <rect x={-18} y={16} width={(36 * Math.max(0, city.hp)) / city.maxHp} height={4}
              fill={city.hp > city.maxHp * 0.5 ? '#4ade80' : city.hp > city.maxHp * 0.25 ? '#facc15' : '#ef4444'} />
          </g>
        );
      })}

      {state.units.map((unit) => {
        const isOwn = unit.faction === viewerFactionId;
        if (!isOwn && !explored.has(hexKey(unit.q, unit.r))) return null;
        const { x, y } = hexToPixel(unit.q, unit.r);
        const def = UNIT_TYPES[unit.type];
        const faction = state.factions[unit.faction];
        const isSelected = unit.id === selectedUnit;
        const damaged = !reducedMotion && recentlyDamaged[unit.id];
        return (
          <g key={`unit-${unit.id}`} transform={`translate(${x}, ${y})`}
             style={{ cursor: isOwn ? 'pointer' : 'default', transition: reducedMotion ? 'none' : 'transform 0.25s' }}
             onClick={() => { setCursor({ q: unit.q, r: unit.r }); onHexActivate(unit.q, unit.r); }}
             role="img"
             aria-label={`${faction?.displayName || unit.faction} ${def.name}, health ${unit.hp} of ${unit.maxHp}${unit.acted ? ', has acted' : ''}`}>
            {isSelected && (
              <circle cx={0} cy={0} r={HEX_SIZE - 6} fill="none" stroke="#ffd700" strokeWidth={2.5} strokeDasharray="3,2">
                {!reducedMotion && <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.8s" repeatCount="indefinite" />}
              </circle>
            )}
            <circle cx={0} cy={0} r={15} fill={def.color} stroke={faction?.accent || '#111'} strokeWidth={2.5}
              opacity={damaged ? 0.4 : 1} />
            <text x={0} y={5} textAnchor="middle" fontSize={16} fontWeight="bold" fill="white" pointerEvents="none">{def.glyph}</text>
            {faction && (
              <text x={12} y={-8} textAnchor="middle" fontSize={10} fontWeight="bold" fill={faction.accent || '#000'} pointerEvents="none">{faction.glyph}</text>
            )}
            <rect x={-16} y={16} width={32} height={3} fill="#222" />
            <rect x={-16} y={16} width={(32 * Math.max(0, unit.hp)) / unit.maxHp} height={3}
              fill={unit.hp > unit.maxHp * 0.5 ? '#4ade80' : unit.hp > unit.maxHp * 0.25 ? '#facc15' : '#ef4444'} />
            {unit.acted && isOwn && <circle cx={12} cy={-12} r={5} fill="#444" stroke="white" strokeWidth={1.5} />}
            {unit.atkBuff > 0 && isOwn && <text x={-14} y={-10} fontSize={11} fill="#b45309" fontWeight="bold">+{unit.atkBuff}</text>}
          </g>
        );
      })}
    </svg>
  );
}

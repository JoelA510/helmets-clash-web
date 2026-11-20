import { useEffect, useState, useRef, type RefObject } from 'react';
import type { AttackTarget, FactionId, GameState, Impact, Hex, HexKey } from '../game/types';
import { TERRAIN, UNIT_TYPES } from '../game/constants';
import { HEX_SIZE, hexKey, hexPoints, hexToPixel, parseKey } from '../game/hex';
import { FactionPatterns } from './FactionPatterns';

import { cardDestination } from '../game/inspection';
import { Emblem, TerrainRelief } from './TabletopArt';
import { boardView } from './boardView';

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
  reducedMotion: boolean;
  boardRef: RefObject<SVGSVGElement | null>;
  // Current view transform. `zoom` shrinks the effective viewBox around
  // its center (higher = more zoomed in); `pan` shifts the viewBox
  // origin in SVG units.
  view: ReturnType<typeof boardView>;
  onPan: (pan: { x: number; y: number }) => void;
  onTouchInspect: (q: number, r: number) => void;
  ready: Set<number>;
  zoom: number;
};

// Renders the SVG hex board for the current viewing faction, applying fog
// of war (only tiles in `explored` render at full visibility). Also renders
// units, cities, and overlays for move-range, attack-targets, targeting,
// the selected unit, and the keyboard cursor.
export function HexBoard({
  state, viewerFactionId, selectedUnit, hoveredHex, setHoveredHex,
  cursor, setCursor, onHexActivate, moveRange, attackTargets,
  reducedMotion, boardRef,
  zoom, view, onPan, onTouchInspect, ready,
}: HexBoardProps) {
  const explored = state.factions[viewerFactionId]?.explored ?? new Set<HexKey>();
  const keys = Object.keys(state.map);

  const gesture = useRef<{ id: number; x: number; y: number; pan: typeof view.pan; scale: number } | null>(null);
  const pointers = useRef(new Set<number>());
  const suppressClick = useRef(false);
  const touch = useRef(false);
  const activate = (q: number, r: number) => {
    setCursor({ q, r });
    setHoveredHex(null);
    if (touch.current) onTouchInspect(q, r);
    else onHexActivate(q, r);
    touch.current = false;
  };

  const cursorKey = cursor ? hexKey(cursor.q, cursor.r) : null;

  return (
    <svg
      ref={boardRef}
      viewBox={`${view.left} ${view.top} ${view.width} ${view.height}`}
      onPointerDown={e => {
        if (e.button !== 0) return;
        const active = pointers.current;
        active.add(e.pointerId);
        touch.current = e.pointerType === 'touch';
        suppressClick.current = active.size > 1 || !e.isPrimary;
        const scale = e.currentTarget.getScreenCTM?.()?.a || 1;
        gesture.current = active.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, pan: view.pan, scale } : null;
      }}
      onPointerMove={e => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;
        if (!suppressClick.current && Math.hypot(dx, dy) < 6) return;
        suppressClick.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        if (zoom > 1) onPan({ x: g.pan.x - dx / g.scale, y: g.pan.y - dy / g.scale });
      }}
      onPointerUp={e => { pointers.current.delete(e.pointerId); gesture.current = null; }}
      onPointerLeave={e => {
        if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
        }
      }}
      onPointerCancel={e => { pointers.current.delete(e.pointerId); gesture.current = null; suppressClick.current = true; }}
      onClickCapture={e => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); } }}
      role="application"
      aria-label="Hex battle map. Use arrow keys to move the cursor, Enter to select or act, Escape to cancel. If a tile has both a friendly unit and city, Enter selects the unit and you can use the side-panel Open city action."
      tabIndex={0}
      className="w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500 rounded"
      style={{ touchAction: zoom > 1 ? 'none' : 'pan-y pinch-zoom' }}
    >
      <FactionPatterns />
      {keys.map((key) => {
        const { q, r } = parseKey(key);
        const tile = state.map[key];
        const { x, y } = hexToPixel(q, r);
        const terrain = TERRAIN[tile.type];
        const isExplored = explored.has(key);
        const isMoveHex = !state.targeting && isExplored && moveRange.has(key);
        const isAttackHex = !state.targeting && isExplored && attackTargets.some((t) => t.target.q === q && t.target.r === r);
        const isHovered = hoveredHex === key;
        const isCursor = cursorKey === key;
        const isTargeting = state.targeting && cardDestination(state, viewerFactionId, state.targeting.card, q, r);

        return (
          <g key={key} data-hex={key} data-tour={isExplored ? "terrain" : undefined} transform={`translate(${x}, ${y})`}>
            <polygon
              points={hexPoints(0, 0)}
              fill={isExplored ? terrain.color : '#58645e'}
              stroke={isCursor ? '#ffffff' : isHovered ? '#ffd700' : isExplored ? terrain.edge : '#4d5954'}
              strokeWidth={isCursor ? 3.5 : isHovered ? 2.5 : 1}
              opacity={isExplored ? 1 : 0.55}
              onClick={() => activate(q, r)}
              onMouseEnter={() => setHoveredHex(key)}
              onMouseLeave={() => setHoveredHex(null)}
              style={{ cursor: 'pointer', transition: reducedMotion ? 'none' : 'stroke 0.15s' }}
              aria-hidden="true"
            />
            {isExplored && <g pointerEvents="none">
              <path d="M-24 -13L0 -27 24 -13" fill="none" stroke="#fff6ce" strokeOpacity=".42" strokeWidth="2" />
              <path d="M-24 13L0 27 24 13" fill="none" stroke="#2d3326" strokeOpacity=".33" strokeWidth="3" />
              <TerrainRelief type={tile.type} />
            </g>}

            {isMoveHex && !isAttackHex && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#2563eb" opacity={0.32} pointerEvents="none" />
            )}
            {isAttackHex && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#dc2626" opacity={reducedMotion ? 0.5 : 0.4} pointerEvents="none">
                {!reducedMotion && <animate attributeName="opacity" values="0.3;0.55;0.3" dur="1s" repeatCount="indefinite" />}
              </polygon>
            )}
            {isTargeting && (
              <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} data-card-target="true" fill="#ded2ff" fillOpacity=".25" stroke="#482362" strokeWidth="3" strokeDasharray="5 2" pointerEvents="none" />
            )}
          </g>
        );
      })}

      {state.cities.map((city) => {
        const isOwn = city.faction === viewerFactionId;
        if (!isOwn && !explored.has(hexKey(city.q, city.r))) return null;
        const { x, y } = hexToPixel(city.q, city.r);
        const faction = state.factions[city.faction];
        const unitOnCity = state.units.find((u) => u.q === city.q && u.r === city.r);
        return (
          <g data-tour={isOwn ? "city" : undefined} key={`city-${city.id}`} transform={`translate(${x}, ${y})`} pointerEvents="none"
             role="img"
             aria-label={`${faction?.displayName || city.faction} city ${city.name}, health ${city.hp} of ${city.maxHp}${unitOnCity ? ', shares this tile with a unit' : ''}`}>
            <g transform={unitOnCity ? 'translate(-9,-8) scale(.73)' : undefined}>
              <path d="M-19 14v-27h6v5h5v-8h5v7h6v-7h5v8h5v-5h6v27z"
                fill={`url(#pattern-${faction.factionPresetId})`} stroke={faction.accent} strokeWidth="2.5"/>
              <path d="M-4 14V7a4 4 0 0 1 8 0v7" fill="#38382e"/>
              {isOwn && faction.buildings.has('walls') && <path d="M-20 11h40v5h-40z" fill="#666759" stroke="#38382e"/>}
              {isOwn && faction.buildings.has('walls2') && <path d="M-21 9V3h5v6h31V3h5v6z" fill="#b4a684"/>}
              {isOwn && faction.buildings.has('watchtower') && <path d="M-22 0v-15h-2l5-8 5 8h-2V0z" fill="#655a49" stroke="#312f28"/>}
              {isOwn && faction.buildings.has('temple') && <path d="M4-4v-10l5-7 5 7v10z" fill="#eee2ae" stroke="#695c39"/>}
            </g>
            <rect x={-18} y={21} width={36} height={4} fill="#333" />
            <rect x={-18} y={21} width={(36 * Math.max(0, city.hp)) / city.maxHp} height={4}
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
        const cityOnUnitHex = state.cities.find((c) => c.q === unit.q && c.r === unit.r);
        const isSelected = unit.id === selectedUnit;
        return (
          <g key={`unit-${unit.id}`} transform={`translate(${x}, ${y})`}
             style={{ cursor: isOwn ? 'pointer' : 'default', transition: reducedMotion ? 'none' : 'transform 0.25s' }}
             data-tour={isOwn ? 'unit' : undefined}
             onMouseEnter={() => setHoveredHex(hexKey(unit.q, unit.r))}
             onMouseLeave={() => setHoveredHex(null)}
             onClick={() => activate(unit.q, unit.r)}
             role="img"
             aria-label={`${faction?.displayName || unit.faction} ${def.name}, health ${unit.hp} of ${unit.maxHp}${unit.acted ? ', has acted' : ''}${cityOnUnitHex ? ', shares this tile with a city' : ''}`}>
            {isSelected && (
              <circle cx={0} cy={0} r={HEX_SIZE - 6} fill="none" stroke="#ffd700" strokeWidth={2.5} strokeDasharray="3,2">
                {!reducedMotion && <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.8s" repeatCount="indefinite" />}
              </circle>
            )}
            <g transform={cityOnUnitHex ? 'translate(8,5) scale(.78)' : undefined}>
            <ellipse cy="4" rx="18" ry="14" fill="#282b23" opacity=".32"/>
            <circle r="16" fill={`url(#pattern-${faction.factionPresetId})`} stroke={faction.accent} strokeWidth="2.5"/>
            <circle r="12" fill={def.color} stroke="#433e34" />
            <g transform="translate(-10,-11)" color="#fff4d6"><Emblem kind={unit.type} size={21}/></g>
            <rect x={-16} y={16} width={32} height={3} fill="#222" />
            <rect x={-16} y={16} width={(32 * Math.max(0, unit.hp)) / unit.maxHp} height={3}
              fill={unit.hp > unit.maxHp * 0.5 ? '#4ade80' : unit.hp > unit.maxHp * 0.25 ? '#facc15' : '#ef4444'} />
            {isOwn && <g><circle cx={12} cy={-12} r={5} fill={ready.has(unit.id) ? '#22634d' : '#444'} stroke="white" strokeWidth={1.5} />
              <path d={ready.has(unit.id) ? 'm9-12 2 2 4-5' : 'M9-12h6'} fill="none" stroke="white" /></g>}
            {unit.atkBuff > 0 && isOwn && <text x={-14} y={-10} fontSize={11} fill="#b45309" fontWeight="bold">+{unit.atkBuff}</text>}
            {/* Level chevrons: one small notch per level earned. */}
            {(unit.level ?? 0) > 0 && (
              <g pointerEvents="none">
                {Array.from({ length: unit.level }, (_, i) => <path key={i} d={`m${-unit.level*2+i*4} -15 2-3 2 3z`} fill="#fbbf24" />)}
              </g>
            )}
            </g>
          </g>
        );
      })}
      {state.impacts?.length ? <BoardImpacts key={state.impactSequence} impacts={state.impacts} viewer={viewerFactionId}/> : null}
    </svg>
  );
}

function BoardImpacts({impacts,viewer}: {impacts: Impact[]; viewer: FactionId}) {
  const [shown,setShown] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setShown(false),2200);
    return () => clearTimeout(timeout);
  },[]);
  if (!shown) return null;
  const rows = new Map<string,number>();
  return <g pointerEvents="none" aria-hidden="true">{impacts.filter(e => e.visibleTo.includes(viewer)).map((e,i) => {
    const key = hexKey(e.q,e.r), row = rows.get(key) ?? 0;
    rows.set(key,row + 1);
    const {x,y} = hexToPixel(e.q,e.r);
    const value = e.kind === 'promotion' ? `Lv ${e.amount}` : e.kind === 'heal' ? `+${e.amount}` : `-${e.amount}`;
    return <text className="board-impact" key={i} x={x} y={y - 18 - row * 13} textAnchor="middle">{value}</text>;
  })}</g>;
}

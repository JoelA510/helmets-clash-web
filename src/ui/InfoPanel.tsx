import type { City, GameState, HexKey, Unit } from '../game/types';
import { TERRAIN, UNIT_TYPES } from '../game/constants';

type InfoPanelProps = {
  selectedUnit: Unit | undefined;
  state: GameState;
  hoveredKey: HexKey | null;
  occupiedFriendlyCity?: City;
  onOpenOccupiedCity?: () => void;
};

export function InfoPanel({ selectedUnit, state, hoveredKey, occupiedFriendlyCity, onOpenOccupiedCity }: InfoPanelProps) {
  if (selectedUnit) {
    const def = UNIT_TYPES[selectedUnit.type];
    const faction = state.factions[selectedUnit.faction];
    return (
      <div className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span aria-hidden="true" className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: def.color }}>{def.glyph}</span>
          <div>
            <div className="font-bold">{def.name}</div>
            <div className="text-xs text-stone-700">{faction?.displayName || selectedUnit.faction}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 text-xs mt-2">
          <Metric label="HP" value={`${selectedUnit.hp}/${selectedUnit.maxHp}`} />
          <Metric label="ATK" value={def.atk + selectedUnit.atkBuff} boosted={selectedUnit.atkBuff > 0} />
          <Metric label="MOV" value={`${def.mov + selectedUnit.movBuff - selectedUnit.moved}/${def.mov + selectedUnit.movBuff}`} />
          <Metric label="RNG" value={def.range} />
        </div>
        {selectedUnit.acted && <div className="text-xs text-stone-700 italic mt-2">Has acted this turn.</div>}
        {occupiedFriendlyCity && onOpenOccupiedCity && (
          <button
            type="button"
            onClick={onOpenOccupiedCity}
            className="mt-3 text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Open city: {occupiedFriendlyCity.name}
          </button>
        )}
      </div>
    );
  }
  if (hoveredKey && state.map[hoveredKey]) {
    const tile = state.map[hoveredKey];
    const terrain = TERRAIN[tile.type];
    return (
      <div className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm">
        <div className="font-bold">{terrain.name}</div>
        <div className="text-xs text-stone-700 mt-1">
          {!terrain.passable && <span className="text-red-700">Impassable · </span>}
          {terrain.defense > 0 && <span>+{terrain.defense} defense · </span>}
          {Object.entries(terrain.yield).map(([k, v]) => `+${v} ${k}`).join(', ') || 'No yield'}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm">
      <div className="text-sm text-stone-800">Select a unit, or hover/cursor a tile for info.</div>
    </div>
  );
}

function Metric({ label, value, boosted }: { label: string; value: string | number; boosted?: boolean }) {
  return (
    <div className="bg-stone-100 rounded p-1 text-center">
      <div className="text-[10px] uppercase tracking-wider text-stone-700">{label}</div>
      <div className={`font-bold ${boosted ? 'text-amber-700' : ''}`}>{value}</div>
    </div>
  );
}

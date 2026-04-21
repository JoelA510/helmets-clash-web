// @ts-nocheck
import React, { useState } from 'react';
import { Castle } from 'lucide-react';
import { Dialog } from './Dialog';
import { BUILDINGS, UNIT_TYPES, LIVING_UNIT_TYPES, UNDEAD_UNIT_TYPES } from '../game/constants';

export function CityModal({ open, onClose, city, faction, canAct, onRecruit, onBuild }) {
  const [tab, setTab] = useState('recruit');
  if (!open || !city || !faction) return null;

  const pool = faction.unitPool === 'undead' ? UNDEAD_UNIT_TYPES : LIVING_UNIT_TYPES;
  const vetBuff = faction.buildings.has('barracks');

  return (
    <Dialog open={open} onClose={onClose} title={city.name} labelledById="city-title" maxWidth="max-w-xl">
      <div className="text-sm text-stone-700 -mt-2 mb-3 flex items-center gap-3">
        <Castle className="text-amber-700" size={18} aria-hidden="true" />
        <span>Walls: <b>{city.hp}/{city.maxHp}</b></span>
        <span>💰 {faction.gold}</span>
        <span>🌾 {faction.food}</span>
      </div>

      <div
        role="tablist"
        aria-label="City actions"
        className="flex gap-1 mb-3 border-b-2 border-amber-200"
      >
        <TabButton tabId="recruit" active={tab === 'recruit'} onClick={() => setTab('recruit')}>Recruit</TabButton>
        <TabButton tabId="build" active={tab === 'build'} onClick={() => setTab('build')}>Construct</TabButton>
      </div>

      {tab === 'recruit' && (
        <div role="tabpanel" aria-labelledby="tab-recruit">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
            {pool.map((t) => {
              const def = UNIT_TYPES[t];
              const affordable = faction.gold >= def.cost.gold && faction.food >= def.cost.food;
              const canRecruit = affordable && canAct;
              const reason = !canAct ? "Not this faction's turn" : !affordable ? `Need ${def.cost.gold} gold and ${def.cost.food} food` : null;
              return (
                <li key={t}>
                  <button
                    onClick={() => onRecruit(t)}
                    disabled={!canRecruit}
                    aria-describedby={reason ? `recruit-${t}-reason` : undefined}
                    className={`w-full text-left rounded-lg p-3 border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${canRecruit ? 'bg-white hover:bg-amber-50 border-amber-400' : 'bg-stone-100 border-stone-300 opacity-60 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span aria-hidden="true" className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: def.color }}>{def.glyph}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{def.name}</div>
                        <div className="text-xs flex gap-2">
                          <span className="text-amber-800 font-semibold">{def.cost.gold} gold</span>
                          <span className="text-yellow-800 font-semibold">{def.cost.food} food</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-stone-700">
                      {def.hp + (vetBuff ? 2 : 0)} HP{vetBuff ? ' (Barracks: +2)' : ''} · {def.atk} ATK · {def.mov} MOV{def.range > 1 ? ` · Range ${def.range}` : ''}
                    </div>
                    {reason && <div id={`recruit-${t}-reason`} className="text-[11px] text-stone-600 italic mt-1">{reason}</div>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-stone-600 italic mt-3">
            New units spawn adjacent to the city and cannot act on their first turn.
          </p>
        </div>
      )}

      {tab === 'build' && (
        <div role="tabpanel" aria-labelledby="tab-build">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
            {Object.entries(BUILDINGS).map(([id, bldg]) => {
              const owned = faction.buildings.has(id);
              const affordable = faction.gold >= bldg.cost.gold && faction.food >= bldg.cost.food;
              const canBuild = !owned && affordable && canAct;
              const reason = owned ? 'Already built' : !canAct ? "Not this faction's turn" : !affordable ? `Need ${bldg.cost.gold} gold and ${bldg.cost.food} food` : null;
              return (
                <li key={id}>
                  <button
                    onClick={() => onBuild(id)}
                    disabled={!canBuild}
                    aria-describedby={reason ? `build-${id}-reason` : undefined}
                    className={`w-full text-left rounded-lg p-3 border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${owned ? 'bg-green-50 border-green-500' : canBuild ? 'bg-white hover:bg-amber-50 border-amber-400' : 'bg-stone-100 border-stone-300 opacity-60 cursor-not-allowed'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span aria-hidden="true" className="text-2xl">{bldg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm">{bldg.name}</div>
                          {owned && <span className="text-[10px] text-green-800 font-semibold uppercase tracking-wide">Built</span>}
                        </div>
                        <div className="text-xs text-stone-800 leading-tight">{bldg.desc}</div>
                        {!owned && (
                          <div className="text-xs mt-1 flex gap-2">
                            <span className="text-amber-800 font-semibold">{bldg.cost.gold} gold</span>
                            <span className="text-yellow-800 font-semibold">{bldg.cost.food} food</span>
                          </div>
                        )}
                        {reason && <div id={`build-${id}-reason`} className="text-[11px] text-stone-600 italic mt-1">{reason}</div>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Dialog>
  );
}

function TabButton({ active, onClick, children, tabId }) {
  return (
    <button
      role="tab"
      id={`tab-${tabId}`}
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-t ${active ? 'border-amber-700 text-amber-900' : 'border-transparent text-stone-700 hover:text-stone-900'}`}
    >
      {children}
    </button>
  );
}

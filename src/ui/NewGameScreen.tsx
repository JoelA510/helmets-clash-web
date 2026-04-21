// @ts-nocheck
import React, { useState } from 'react';
import { Crown, UserRound, Bot, Ban } from 'lucide-react';
import { FACTION_PRESETS, MAP_SIZES, MAP_TYPES } from '../game/constants';

// Fresh-config defaults: 1 human + 1 AI, medium continents map.
const DEFAULT_CONFIG = {
  mapSize: 'medium',
  mapType: 'continents',
  seats: [
    { kind: 'human', name: 'Player 1' },
    { kind: 'ai',    name: 'AI Grimhold' },
    { kind: 'empty', name: '' },
    { kind: 'empty', name: '' },
  ],
  seed: undefined,
};

const SEAT_KIND_ICON = { human: UserRound, ai: Bot, empty: Ban };
const SEAT_KIND_LABEL = { human: 'Human', ai: 'AI', empty: 'Empty' };

export function NewGameScreen({ onStart, initialConfig }) {
  const [config, setConfig] = useState(() => initialConfig || DEFAULT_CONFIG);

  const cycleSeat = (idx) => {
    setConfig((c) => {
      const order = ['human', 'ai', 'empty'];
      const next = [...c.seats];
      const cur = next[idx].kind;
      const nextKind = order[(order.indexOf(cur) + 1) % order.length];
      const preset = FACTION_PRESETS[idx];
      next[idx] = {
        ...next[idx],
        kind: nextKind,
        name: nextKind === 'empty' ? '' : next[idx].name || (nextKind === 'ai' ? `AI ${preset.name}` : `Player ${idx + 1}`),
      };
      return { ...c, seats: next };
    });
  };

  const setSeatName = (idx, name) => {
    setConfig((c) => {
      const next = [...c.seats];
      next[idx] = { ...next[idx], name };
      return { ...c, seats: next };
    });
  };

  const activeCount = config.seats.filter((s) => s.kind !== 'empty').length;
  const canStart = activeCount >= 2;

  const submit = (e) => {
    e.preventDefault();
    if (!canStart) return;
    onStart({
      ...config,
      seed: config.seed || Math.floor(Math.random() * 1_000_000_000),
    });
  };

  return (
    <main className="w-full min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 text-stone-800" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Crown className="text-amber-700" size={32} aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold tracking-wide">Helmets Clash</h1>
            <p className="text-sm text-stone-600 -mt-1">Set up a new campaign</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Seats */}
          <section aria-labelledby="seats-heading" className="bg-white/80 rounded-lg border border-stone-200 p-4 shadow-sm">
            <h2 id="seats-heading" className="text-lg font-semibold mb-1">Seats</h2>
            <p className="text-sm text-stone-600 mb-3">
              Configure 2–4 players. Fill extra slots with AI, or leave them empty for a smaller match.
            </p>
            <ul className="space-y-2" role="list">
              {config.seats.map((seat, idx) => {
                const preset = FACTION_PRESETS[idx];
                const Icon = SEAT_KIND_ICON[seat.kind];
                return (
                  <li key={idx} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded p-2">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: preset.color, color: preset.accent }}
                    >
                      {preset.glyph}
                    </span>
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-stone-500">Seat {idx + 1} · {preset.name}</div>
                      {seat.kind === 'empty' ? (
                        <div className="text-sm text-stone-500 italic">Empty (skipped)</div>
                      ) : (
                        <label className="block">
                          <span className="sr-only">Display name for seat {idx + 1}</span>
                          <input
                            type="text"
                            value={seat.name}
                            onChange={(e) => setSeatName(idx, e.target.value)}
                            maxLength={24}
                            className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          />
                        </label>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => cycleSeat(idx)}
                      aria-label={`Change seat ${idx + 1} kind; currently ${SEAT_KIND_LABEL[seat.kind]}`}
                      className="shrink-0 inline-flex items-center gap-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-semibold px-3 py-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Icon size={16} aria-hidden="true" />
                      {SEAT_KIND_LABEL[seat.kind]}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!canStart && (
              <p className="text-sm text-red-700 mt-2" role="alert">
                Need at least two non-empty seats to start.
              </p>
            )}
          </section>

          {/* Map size */}
          <fieldset className="bg-white/80 rounded-lg border border-stone-200 p-4 shadow-sm">
            <legend className="text-lg font-semibold px-1">Map size</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {Object.entries(MAP_SIZES).map(([id, info]) => (
                <label key={id} className={`cursor-pointer rounded-lg border-2 p-2 text-center transition ${config.mapSize === id ? 'bg-amber-50 border-amber-600' : 'bg-stone-50 border-stone-300 hover:bg-amber-50/60'}`}>
                  <input
                    type="radio"
                    name="mapSize"
                    value={id}
                    checked={config.mapSize === id}
                    onChange={() => setConfig((c) => ({ ...c, mapSize: id }))}
                    className="sr-only"
                  />
                  <div className="font-semibold text-sm">{info.label}</div>
                  <div className="text-xs text-stone-600">{info.cols}×{info.rows}</div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Map type */}
          <fieldset className="bg-white/80 rounded-lg border border-stone-200 p-4 shadow-sm">
            <legend className="text-lg font-semibold px-1">Map type</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {Object.entries(MAP_TYPES).map(([id, info]) => (
                <label key={id} className={`cursor-pointer rounded-lg border-2 p-3 transition ${config.mapType === id ? 'bg-amber-50 border-amber-600' : 'bg-stone-50 border-stone-300 hover:bg-amber-50/60'}`}>
                  <input
                    type="radio"
                    name="mapType"
                    value={id}
                    checked={config.mapType === id}
                    onChange={() => setConfig((c) => ({ ...c, mapType: id }))}
                    className="sr-only"
                  />
                  <div className="font-semibold text-sm">{info.label}</div>
                  <div className="text-xs text-stone-600">{info.desc}</div>
                </label>
              ))}
            </div>
            <p className="text-xs text-stone-600 mt-2">
              All map types guarantee every seat can reach every other by land — corridors are carved through mountains and rivers automatically when needed.
            </p>
          </fieldset>

          {/* Seed */}
          <label className="block bg-white/80 rounded-lg border border-stone-200 p-4 shadow-sm">
            <span className="text-lg font-semibold">Seed</span>
            <span className="block text-xs text-stone-600 mb-2">Leave blank for a random seed. Same seed + same config = identical map.</span>
            <input
              type="number"
              value={config.seed ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, seed: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="(random)"
              min={0}
              className="w-full sm:w-48 bg-white border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canStart}
              className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 disabled:text-stone-500 text-white font-semibold px-6 py-2.5 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Begin Campaign
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

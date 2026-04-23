// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, Wheat, Sparkles, Skull, Crown, HelpCircle, Hammer, RotateCcw } from 'lucide-react';
import { HEX_NAV, hexKey } from '../game/hex';
import { computeMoveRange, computeAttackTargets } from '../game/logic';
import { initialState, checkVictory } from '../game/state';
import { runAITurnFor } from '../game/ai';
import { applyEndOfSeatTurn, applyStartOfSeatTurn, nextLivingSeat } from '../game/turn';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { HexBoard } from './HexBoard';
import { InfoPanel } from './InfoPanel';
import { HandBar } from './HandBar';
import { CityModal } from './CityModal';
import { HelpModal } from './HelpModal';
import { PassDeviceModal } from './PassDeviceModal';
import { EndScreen } from './EndScreen';
import { performPlayerAttack, performMove, performRecruit, performBuild, performPlayUntargetedCard, performPlayTargetedCard } from './gameActions';
import { BUILDINGS } from '../game/constants';

// The orchestrating game screen. Owns: state, selection cursor, turn loop,
// pass-device gate, AI advancement, victory.
export function GameScreen({ config, onExit }) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState(() => initialState(config));
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [hoveredHex, setHoveredHex] = useState(null);
  const [recentlyDamaged, setRecentlyDamaged] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // The faction whose perspective is currently rendered (fog, hand). Starts
  // as the first human seat, or the first seat overall if no humans. The
  // viewer rotates explicitly on pass-device confirm.
  const [viewerFactionId, setViewerFactionId] = useState(() => {
    const firstHuman = state.seats.find((s) => state.factions[s.factionId]?.kind === 'human');
    return firstHuman?.factionId ?? state.seats[0]?.factionId;
  });

  // Pass-device modal control. When true, the board state below is hidden.
  const [passSeatIdx, setPassSeatIdx] = useState(null);

  // Keyboard cursor on the hex grid. Initialized to the active viewer's
  // first city if they have one; otherwise the first explored tile on the map.
  const [cursor, setCursor] = useState(() => {
    const c = state.cities.find((x) => x.faction === viewerFactionId);
    return c ? { q: c.q, r: c.r } : { q: 0, r: 0 };
  });

  // Tracks whether we've already done the start-of-turn for the very first
  // seat at game start (so we don't double-apply when the first human "Ready"s).
  const startAppliedRef = useRef(new Set());

  const announcerRef = useRef(null);
  const boardRef = useRef(null);

  // -- Apply start-of-turn for the first seat on mount --
  useEffect(() => {
    setState((s) => {
      if (startAppliedRef.current.has(s.activeSeatIdx)) return s;
      const ns = cloneShallow(s);
      applyStartOfSeatTurn(ns, ns.seats.find((seat) => seat.idx === ns.activeSeatIdx).factionId);
      startAppliedRef.current.add(s.activeSeatIdx);
      return ns;
    });
    // Focus the board on mount for keyboard users.
    boardRef.current?.focus?.();
  }, []);

  const activeSeat = state.seats.find((s) => s.idx === state.activeSeatIdx);
  const activeFaction = activeSeat ? state.factions[activeSeat.factionId] : null;
  const isViewerActive = viewerFactionId === activeSeat?.factionId;
  const ended = state.status === 'ended';

  // Move/attack overlays only when the selected unit belongs to the viewer
  // AND the viewer is the active seat. Depends on the full `state` (rather
  // than narrowed slices) because the React Compiler's exhaustive-deps
  // rule rejects field-level deps when the callback passes `state` through
  // to a helper. Recomputing on any state change is acceptable — the
  // helpers are O(hex count × units) and hex counts stay small.
  const moveRange = useMemo(() => {
    if (!selectedUnit || !isViewerActive) return new Map();
    const u = state.units.find((x) => x.id === selectedUnit);
    if (!u || u.faction !== viewerFactionId) return new Map();
    return computeMoveRange(u, state);
  }, [selectedUnit, state, viewerFactionId, isViewerActive]);

  const attackTargets = useMemo(() => {
    if (!selectedUnit || !isViewerActive) return [];
    const u = state.units.find((x) => x.id === selectedUnit);
    if (!u || u.faction !== viewerFactionId || u.acted) return [];
    return computeAttackTargets(u, state);
  }, [selectedUnit, state, viewerFactionId, isViewerActive]);

  const flashDamage = (id) => {
    if (reducedMotion) return;
    setRecentlyDamaged((d) => ({ ...d, [id]: Date.now() }));
    setTimeout(() => {
      setRecentlyDamaged((d) => { const n = { ...d }; delete n[id]; return n; });
    }, 600);
  };

  // -- Hex activation (click or Enter on cursor) --
  const handleHexActivate = (q, r) => {
    if (ended || !isViewerActive || passSeatIdx !== null) return;

    if (state.targeting) {
      const result = performPlayTargetedCard(state, viewerFactionId, state.targeting.card, q, r);
      if (result.valid) {
        setState(result.state);
      }
      return;
    }

    const unitAt = state.units.find((u) => u.q === q && u.r === r);
    const cityAt = state.cities.find((c) => c.q === q && c.r === r);

    if (selectedUnit) {
      const unit = state.units.find((u) => u.id === selectedUnit);
      if (!unit) { setSelectedUnit(null); return; }
      if (unitAt && unitAt.faction === viewerFactionId && unitAt.id !== selectedUnit) {
        setSelectedUnit(unitAt.id);
        return;
      }
      const atkTarget = attackTargets.find((t) => t.target.q === q && t.target.r === r);
      if (atkTarget && !unit.acted) {
        flashDamage(atkTarget.target.id || `city-${atkTarget.target.name}`);
        setState(performPlayerAttack(state, unit.id, atkTarget));
        setSelectedUnit(null);
        return;
      }
      const moveCost = moveRange.get(hexKey(q, r));
      if (moveCost !== undefined && !unitAt && !cityAt) {
        setState(performMove(state, unit.id, q, r, moveCost));
        return;
      }
      setSelectedUnit(null);
      return;
    }

    if (unitAt && unitAt.faction === viewerFactionId) {
      setSelectedUnit(unitAt.id);
      return;
    }
    if (cityAt && cityAt.faction === viewerFactionId) {
      setCityModalOpen(true);
    }
  };

  // -- Card play handler --
  const playCard = (card) => {
    if (!isViewerActive || ended || state.targeting || passSeatIdx !== null) return;
    if (state.factions[viewerFactionId].orders < card.cost) return;
    if (card.target !== 'none') {
      setState((s) => ({ ...s, targeting: { card } }));
      return;
    }
    setState(performPlayUntargetedCard(state, viewerFactionId, card));
  };

  // -- Recruit / build --
  const recruitUnit = (type) => {
    if (!isViewerActive) return;
    setState((s) => performRecruit(s, viewerFactionId, type));
  };

  const constructBuilding = (id) => {
    if (!isViewerActive) return;
    setState((s) => performBuild(s, viewerFactionId, id));
  };

  // -- Turn advancement: end turn + AI loop + pass-device gate --
  // Wrapped in a functional setState so the entire transition is atomic
  // against `prev`, not against a possibly-stale closure snapshot. Guards
  // against a user double-click / click-plus-E-keypress advancing the turn
  // loop twice before React commits the first update.
  const endTurn = () => {
    if (!isViewerActive || ended) return;
    setSelectedUnit(null);

    let nextPassSeat = null;
    setState((prev) => {
      if (prev.status === 'ended') return prev;
      const prevActive = prev.seats.find((x) => x.idx === prev.activeSeatIdx);
      if (!prevActive || prevActive.factionId !== viewerFactionId) return prev;

      const s = cloneShallow(prev);
      applyEndOfSeatTurn(s, prevActive.factionId);

      // Advance through AI seats until we either reach a human or end.
      let safety = 8;
      while (safety-- > 0) {
        const v = checkVictory(s);
        if (v.status === 'ended') {
          s.status = 'ended';
          s.winner = v.winner;
          break;
        }
        const next = nextLivingSeat(s, s.activeSeatIdx);
        if (!next) break;
        s.activeSeatIdx = next.idx;
        // Crossing a turn boundary: the next seat's idx wraps to or below
        // the seat we just ended.
        if (next.idx <= prevActive.idx) s.turn += 1;

        const f = s.factions[next.factionId];
        if (f.kind === 'ai') {
          applyStartOfSeatTurn(s, next.factionId);
          runAITurnFor(s, next.factionId);
          applyEndOfSeatTurn(s, next.factionId);
          const v2 = checkVictory(s);
          if (v2.status === 'ended') { s.status = 'ended'; s.winner = v2.winner; break; }
          continue;
        }
        const humanCount = Object.values(s.factions).filter((x) => x.kind === 'human').length;
        if (humanCount > 1) {
          // Defer pass-device UI update until outside the reducer.
          nextPassSeat = next.idx;
        } else {
          applyStartOfSeatTurn(s, next.factionId);
          startAppliedRef.current.add(next.idx);
        }
        break;
      }
      return s;
    });
    if (nextPassSeat !== null) setPassSeatIdx(nextPassSeat);
  };

  const confirmPass = () => {
    setState((s) => {
      const seat = s.seats.find((x) => x.idx === passSeatIdx);
      if (!seat) return s;
      const ns = cloneShallow(s);
      applyStartOfSeatTurn(ns, seat.factionId);
      startAppliedRef.current.add(seat.idx);
      return ns;
    });
    const seat = state.seats.find((x) => x.idx === passSeatIdx);
    if (seat) {
      setViewerFactionId(seat.factionId);
      const c = state.cities.find((x) => x.faction === seat.factionId);
      if (c) setCursor({ q: c.q, r: c.r });
    }
    setPassSeatIdx(null);
    setTimeout(() => boardRef.current?.focus?.(), 0);
  };

  const cancelTargeting = () => setState((s) => ({ ...s, targeting: null }));

  // Latest-handler refs so the keyboard effect (mounted once) always calls
  // the current closures without re-binding the listener every render.
  const endTurnRef = useRef(endTurn);
  const handleHexActivateRef = useRef(handleHexActivate);
  const stateRef = useRef(state);
  const cursorRef = useRef(cursor);
  const activeRef = useRef(isViewerActive);
  const endedRef = useRef(ended);
  const passRef = useRef(passSeatIdx);
  const selectedRef = useRef(selectedUnit);
  const cityRef = useRef(cityModalOpen);
  useEffect(() => {
    endTurnRef.current = endTurn;
    handleHexActivateRef.current = handleHexActivate;
    stateRef.current = state;
    cursorRef.current = cursor;
    activeRef.current = isViewerActive;
    endedRef.current = ended;
    passRef.current = passSeatIdx;
    selectedRef.current = selectedUnit;
    cityRef.current = cityModalOpen;
  });

  // -- Keyboard handling on the board (and globally for shortcuts) --
  // The handler is mounted once and reads the latest closures via refs.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (passRef.current !== null) return;

      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey) {
        if (activeRef.current && !endedRef.current) { e.preventDefault(); endTurnRef.current(); return; }
      }
      if (e.key === '?') { e.preventDefault(); setShowHelp(true); return; }
      if (e.key === 'Escape') {
        if (stateRef.current.targeting) { setState((s) => ({ ...s, targeting: null })); return; }
        if (selectedRef.current) { setSelectedUnit(null); return; }
        if (cityRef.current) { setCityModalOpen(false); return; }
      }
      if (document.activeElement === boardRef.current) {
        const dir = HEX_NAV[e.key];
        if (dir) {
          e.preventDefault();
          setCursor((c) => {
            const nq = c.q + dir.q, nr = c.r + dir.r;
            if (stateRef.current.map[hexKey(nq, nr)]) return { q: nq, r: nr };
            return c;
          });
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const c = cursorRef.current;
          handleHexActivateRef.current(c.q, c.r);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // -- Aria-live announcements for log changes --
  const lastLogIdxRef = useRef(state.log.length);
  useEffect(() => {
    if (state.log.length === lastLogIdxRef.current) return;
    const newest = state.log[state.log.length - 1];
    if (newest && announcerRef.current) {
      announcerRef.current.textContent = newest.text;
    }
    lastLogIdxRef.current = state.log.length;
  }, [state.log]);

  // Render-time computed values
  const selectedUnitObj = state.units.find((u) => u.id === selectedUnit);
  const viewer = state.factions[viewerFactionId];
  const viewerCity = state.cities.find((c) => c.faction === viewerFactionId);
  const maxOrders = 3 + (viewer?.buildings.has('war_council') ? 1 : 0);
  const passSeat = passSeatIdx !== null ? state.seats.find((s) => s.idx === passSeatIdx) : null;
  const passFaction = passSeat ? state.factions[passSeat.factionId] : null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 text-stone-800" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
      <div className="max-w-7xl mx-auto p-3">
        <header className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <Crown className="text-amber-700" size={28} aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-stone-900">Helmets Clash</h1>
              <div className="text-xs text-stone-700 -mt-1">Turn {state.turn} · {activeFaction?.displayName || 'Unknown'}{!isViewerActive && ' (waiting)'}</div>
            </div>
          </div>
          <nav aria-label="Main controls" className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-lg px-4 py-2 shadow-sm border border-stone-300">
            <Stat icon={<Coins size={18} className="text-amber-700" aria-hidden="true" />} label="Gold" value={viewer?.gold ?? 0} />
            <Stat icon={<Wheat size={18} className="text-yellow-800" aria-hidden="true" />} label="Food" value={viewer?.food ?? 0} />
            <Stat icon={<Sparkles size={18} className="text-indigo-700" aria-hidden="true" />} label="Orders" value={`${viewer?.orders ?? 0}/${maxOrders}`} />
            <div className="h-8 w-px bg-stone-300" aria-hidden="true" />
            <button
              type="button"
              onClick={endTurn}
              disabled={!isViewerActive || ended}
              aria-keyshortcuts="E"
              className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 disabled:text-stone-600 text-white font-semibold px-4 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition"
            >
              End Turn (E)
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              aria-label="Open help"
              aria-keyshortcuts="?"
              className="text-stone-700 hover:text-stone-900 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <HelpCircle size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit to main menu"
              className="text-stone-700 hover:text-stone-900 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </nav>
        </header>

        {/* Polite live region for log updates */}
        <div ref={announcerRef} role="status" aria-live="polite" className="sr-only" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
          <div className="relative bg-gradient-to-b from-sky-100 to-amber-50 rounded-lg border-2 border-stone-300 shadow-inner overflow-hidden">
            {state.targeting && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-indigo-900 text-white px-4 py-2 rounded shadow flex items-center gap-3" role="status">
                <span className="text-sm">Select target for <b>{state.targeting.card.name}</b></span>
                <button type="button" onClick={cancelTargeting} className="hover:text-red-200 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Cancel</button>
              </div>
            )}
            {!isViewerActive && !ended && (
              <div className="absolute top-2 right-2 z-20 bg-stone-800/95 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2" role="status">
                <Skull size={16} className={reducedMotion ? '' : 'animate-pulse'} aria-hidden="true" />
                <span>{activeFaction?.displayName} is plotting…</span>
              </div>
            )}
            <HexBoard
              state={state}
              viewerFactionId={viewerFactionId}
              selectedUnit={selectedUnit}
              hoveredHex={hoveredHex}
              setHoveredHex={setHoveredHex}
              cursor={cursor}
              setCursor={setCursor}
              onHexActivate={handleHexActivate}
              moveRange={moveRange}
              attackTargets={attackTargets}
              recentlyDamaged={recentlyDamaged}
              reducedMotion={reducedMotion}
              boardRef={boardRef}
            />
          </div>

          <aside aria-label="Side panel" className="flex flex-col gap-3">
            <InfoPanel selectedUnit={selectedUnitObj} state={state} hoveredKey={hoveredHex} viewerFactionId={viewerFactionId} />

            <section aria-labelledby="structures-heading" className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm">
              <h2 id="structures-heading" className="text-xs uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1 font-semibold">
                <Hammer size={14} aria-hidden="true" /> Structures
              </h2>
              {viewer && viewer.buildings.size === 0 ? (
                <div className="text-xs text-stone-700 italic">None yet. Activate your city to build.</div>
              ) : (
                <ul className="space-y-1" role="list">
                  {viewer && Array.from(viewer.buildings).map((id) => (
                    <li key={id} className="flex items-center gap-2 text-xs">
                      <span aria-hidden="true" className="text-base">{BUILDINGS[id].icon}</span>
                      <span className="font-semibold">{BUILDINGS[id].name}</span>
                      <span className="text-stone-700 text-[10px]">· {BUILDINGS[id].desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="chronicle-heading" className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm flex-1 min-h-[150px]">
              <h2 id="chronicle-heading" className="text-xs uppercase tracking-wider text-stone-700 mb-2 font-semibold">Chronicle</h2>
              <ol className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {[...state.log].reverse().map((entry, i) => (
                  <li key={i} className={entry.faction === 'system' ? 'text-stone-700 italic' : 'text-stone-900'}>
                    <span className="text-stone-500">T{entry.turn}:</span> {entry.text}
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        <HandBar
          faction={viewer}
          canPlay={!state.targeting && !ended}
          isViewerActive={isViewerActive}
          onPlayCard={playCard}
        />

        {/* Status footer */}
        <footer className="mt-3 text-xs text-stone-700 text-center">
          Map: {state.config.resolvedMapType || state.config.mapType} · {state.mapCols}×{state.mapRows} · Seed {state.config.seed} · {Object.values(state.factions).length} factions
        </footer>
      </div>

      <CityModal
        open={cityModalOpen && !!viewerCity}
        onClose={() => setCityModalOpen(false)}
        city={viewerCity}
        faction={viewer}
        canAct={isViewerActive}
        onRecruit={recruitUnit}
        onBuild={constructBuilding}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <PassDeviceModal
        open={passSeatIdx !== null}
        seatName={passSeat?.name || passFaction?.displayName || ''}
        factionName={passFaction?.name || ''}
        factionGlyph={passFaction?.glyph || ''}
        factionColor={passFaction?.color || '#8b6b2a'}
        onReady={confirmPass}
      />

      <EndScreen
        open={ended}
        winner={state.winner}
        faction={state.winner ? state.factions[state.winner] : null}
        turn={state.turn}
        onNewGame={() => onExit('replay')}
        onMainMenu={() => onExit('menu')}
      />
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="text-sm">
        <div className="text-xs text-stone-700 leading-none">{label}</div>
        <div className="font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

// Shallow-clone game state preserving Sets in faction sub-objects so we can
// mutate them without affecting the previous reference. Used by the turn loop
// where many helpers expect a fresh `ns` they can write to.
function cloneShallow(s) {
  const factions = {};
  for (const [k, v] of Object.entries(s.factions)) {
    factions[k] = {
      ...v,
      buildings: new Set(v.buildings),
      explored: new Set(v.explored),
      hand: [...v.hand],
      deck: [...v.deck],
      discard: [...v.discard],
    };
  }
  return {
    ...s,
    factions,
    units: s.units.map((u) => ({ ...u })),
    cities: s.cities.map((c) => ({ ...c })),
    log: [...s.log],
  };
}

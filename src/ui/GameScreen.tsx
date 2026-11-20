import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Coins, Wheat, Sparkles, HelpCircle, Hammer, RotateCcw, Undo2, Settings, BookOpen } from 'lucide-react';
import type {
  BuildingId, Card, FactionId, GameConfig, GameState,
  Hex, HexKey, UnitType,
} from '../game/types';
import { HEX_NAV, hexKey, hexToPixel } from '../game/hex';
import { readyUnits, computeMoveRange, computeAttackTargets, factionHasUnmovedUnit } from '../game/logic';
import { initialState } from '../game/state';
import { playOpeningAITurns, reducer } from '../game/reducer';
import { debouncedSaveGame, clearSave, flushPendingSave } from '../game/persist';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useUIPrefs } from '../hooks/useUIPrefs';
import { HexBoard } from './HexBoard';
import { InfoPanel } from './InfoPanel';
import { targetLabels } from './cardLabels';
import { HandBar } from './HandBar';
import { boardBounds, boardView, centeredPan } from './boardView';
import { turnIncome, nextDraw, nextOrders } from '../game/turn';
import { cardDestination } from '../game/inspection';
import { ActionFeedback } from './ActionFeedback';
import { Dialog } from './Dialog';
import { Emblem } from './TabletopArt';
import { CityModal } from './CityModal';
import { HelpModal } from './HelpModal';
import { PassDeviceModal } from './PassDeviceModal';
import { EndScreen } from './EndScreen';
import { SettingsModal } from './SettingsModal';
import { TutorialOverlay } from './TutorialOverlay';
import { TurnBanner } from './TurnBanner';
import { BUILDINGS } from '../game/constants';

type GameScreenProps = {
  config: GameConfig;
  onExit: (mode: 'menu' | 'replay') => void;
  // When present, GameScreen uses this snapshot instead of generating a
  // fresh game. Used by the App-level localStorage resume flow.
  initialState?: GameState;
};

// The orchestrating game screen. Owns: state, selection cursor, turn loop,
// pass-device gate, AI advancement, victory.
export function GameScreen({ config, onExit, initialState: resumed }: GameScreenProps) {
  const reducedMotion = useReducedMotion();
  // Canonical game state lives behind useReducer now. Every transition is
  // represented by a tagged action dispatched through the reducer; see
  // src/game/reducer.ts for the action union.
  // `playOpeningAITurns` runs any AI seats ahead of the first human, for a
  // new game and a resumed one alike; nothing else would ever play them.
  const [state, dispatch] = useReducer(reducer, resumed ?? null, (r) =>
    playOpeningAITurns(r ?? initialState(config)));
  const [saved, setSaved] = useState(true);
  const [prefs, setPrefs] = useUIPrefs();
  // Selection lives on GameState (state.selectedUnitId) so it's captured
  // by the autosave and part of the reducer's pure contract. These
  // aliases keep the rendering / guard code readable.
  const selectedUnit = state.selectedUnitId;
  const setSelectedUnit = (unitId: number | null) => dispatch({ type: 'SELECT_UNIT', unitId });
  const [hoveredHex, setHoveredHex] = useState<HexKey | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => prefs.tutorial === 'unseen');
  const [openCityId, setOpenCityId] = useState<number | null>(null);
  // End-Turn confirmation dialog state. Only engaged when the user's
  // `confirmEndTurnWithActions` pref is on AND the viewer still has an
  // unmoved unit with a legal move.
  const [endTurnConfirm, setEndTurnConfirm] = useState(false);
  // Game-scoped opt-out of the End-Turn warning. Set when the user ticks the
  // modal's "don't warn me again this game" box and confirms. Intentionally
  // local React state, NOT a persisted pref: it resets automatically when a
  // new game starts because App.tsx remounts GameScreen via `key={gameKey}`.
  // The global `confirmEndTurnWithActions` pref stays the master switch.
  const [suppressEndTurnWarning, setSuppressEndTurnWarning] = useState(false);
  // Transient checkbox state inside the modal; committed to
  // `suppressEndTurnWarning` only if the user confirms "End turn anyway".
  const [dontWarnThisGame, setDontWarnThisGame] = useState(false);
  // The faction whose perspective is currently rendered (fog, hand). Starts
  // as the active seat when it's a human's turn and no pass-device gate is
  // pending (a resumed hot-seat game, mid-turn); otherwise the first human
  // seat, or the first seat overall if no humans. The viewer rotates
  // explicitly on pass-device confirm. `initialState` is
  // contractually required to produce at least one seat (2-seat minimum
  // enforced by NewGameScreen) — if it somehow didn't, this throws at
  // mount rather than letting an `undefined` leak through.
  const [viewerFactionId, setViewerFactionId] = useState<FactionId>(() => {
    const active = state.seats.find((s) => s.idx === state.activeSeatIdx);
    if (active && state.pendingPassSeatIdx == null && state.factions[active.factionId]?.kind === 'human') {
      return active.factionId;
    }
    const firstHuman = state.seats.find((s) => state.factions[s.factionId]?.kind === 'human');
    const fallback = state.seats[0];
    if (!firstHuman && !fallback) {
      throw new Error('initialState produced no seats — game cannot render');
    }
    return (firstHuman ?? fallback).factionId;
  });

  // Keyboard cursor on the hex grid. Initialized to the active viewer's
  // first city if they have one; otherwise the first explored tile on the map.
  const [cursor, setCursor] = useState<Hex>(() => {
    const c = state.cities.find((x) => x.faction === viewerFactionId);
    return c ? { q: c.q, r: c.r } : { q: 0, r: 0 };
  });

  const [pending, setPending] = useState<{ state: GameState; hex: Hex } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const bounds = useMemo(() => boardBounds(state.map), [state.map]);
  const [zoom, setZoom] = useState(2);
  const [pan, setPan] = useState(() => centeredPan(bounds, 2, cursor));
  const view = boardView(bounds, zoom, pan);
  const centerHex = (hex: Hex, newZoom = zoom) => {
    setZoom(newZoom);
    setPan(centeredPan(bounds, newZoom, hex));
  };
  const inspectCursor = (hex: Hex) => {
    setCursor(hex);
    setHoveredHex(null);
    setPending(null);
    const p = hexToPixel(hex.q, hex.r);
    if (p.x < view.left + 30 || p.x > view.left + view.width - 30 ||
        p.y < view.top + 30 || p.y > view.top + view.height - 30) centerHex(hex);
  };
  const keyboardInspect = useRef(inspectCursor);
  const boardRef = useRef<SVGSVGElement | null>(null);

  // Focus the board on mount for keyboard users. `initialState` now
  // pre-applies start-of-turn housekeeping for seat 0 so no mount-effect
  // dispatch is needed to prime orders / card draw / fog reveal.
  useEffect(() => {
    if (!document.querySelector('[aria-modal="true"]')) boardRef.current?.focus?.();
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

  // -- Hex activation (click or Enter on cursor) --
  const handleHexActivate = (q: number, r: number) => {
    setPending(null);
    if (ended || !isViewerActive || state.pendingPassSeatIdx !== null) return;

    if (state.targeting) {
      dispatch({
        type: 'PLAY_CARD_TARGETED',
        factionId: viewerFactionId,
        card: state.targeting.card,
        q, r,
      });
      return;
    }

    const unitAt = state.units.find((u) => u.q === q && u.r === r);
    const cityAt = state.cities.find((c) => c.q === q && c.r === r);
    const friendlyUnitAt = unitAt?.faction === viewerFactionId ? unitAt : null;
    const friendlyCityAt = cityAt?.faction === viewerFactionId ? cityAt : null;

    if (selectedUnit) {
      const unit = state.units.find((u) => u.id === selectedUnit);
      if (!unit) { setSelectedUnit(null); return; }
      if (unitAt && unitAt.faction === viewerFactionId && unitAt.id !== selectedUnit) {
        setSelectedUnit(unitAt.id);
        return;
      }
      const atkTarget = attackTargets.find((t) => t.target.q === q && t.target.r === r);
      if (atkTarget && !unit.acted) {
        // Reducer's ATTACK case clears selection as part of the same
        // transition, so no explicit SELECT_UNIT(null) is needed here.
        dispatch({ type: 'ATTACK', attackerId: unit.id, target: atkTarget });
        return;
      }
      const moveCost = moveRange.get(hexKey(q, r));
      if (moveCost !== undefined && !unitAt && (!cityAt || cityAt.faction === viewerFactionId)) {
        dispatch({ type: 'MOVE_UNIT', unitId: unit.id, q, r, moveCost });
        return;
      }
      // If a friendly unit is standing in the viewer's city, allow a
      // second activation on that tile to open city management instead of
      // forcing a deselect-only dead end.
      if (cityAt && cityAt.faction === viewerFactionId && unitAt?.id === selectedUnit) {
        setOpenCityId(cityAt.id);
        return;
      }
      setSelectedUnit(null);
      return;
    }

    if (friendlyUnitAt) {
      setSelectedUnit(friendlyUnitAt.id);
      return;
    }
    if (friendlyCityAt) {
      setOpenCityId(friendlyCityAt.id);
    }
  };

  // -- Card play handler --
  const playCard = (card: Card) => {
    if (!isViewerActive || ended || state.targeting || state.pendingPassSeatIdx !== null) return;
    if (state.factions[viewerFactionId].orders < card.cost) return;
    if (card.target !== 'none') {
      dispatch({ type: 'BEGIN_TARGETING', card });
      return;
    }
    dispatch({ type: 'PLAY_CARD_UNTARGETED', factionId: viewerFactionId, card });
  };

  // -- Recruit / build --
  const recruitUnit = (type: UnitType) => {
    if (!isViewerActive) return;
    dispatch({ type: 'RECRUIT', factionId: viewerFactionId, unitType: type });
  };

  const constructBuilding = (id: BuildingId) => {
    if (!isViewerActive) return;
    dispatch({ type: 'BUILD', factionId: viewerFactionId, building: id });
  };

  // -- End turn: reducer handles the AI loop + pass-device gate atomically,
  // and clears selection as part of the same transition. Optionally prompts
  // first when the user has `confirmEndTurnWithActions` set, hasn't muted the
  // warning for this game, and the viewer still has an unmoved unit that could
  // legally move. The "unmoved unit with a legal move" check lives in the rule
  // engine (factionHasUnmovedUnit) so it stays consistent with movement rules.
  const doEndTurn = () => {
    setOpenCityId(null);
    dispatch({ type: 'END_TURN', viewerFactionId });
  };
  const endTurn = () => {
    if (!isViewerActive || ended) return;
    if (prefs.confirmEndTurnWithActions && !suppressEndTurnWarning
        && factionHasUnmovedUnit(state, viewerFactionId)) {
      setEndTurnConfirm(true);
      return;
    }
    doEndTurn();
  };
  // Dismiss the modal without ending the turn. Resets only the transient
  // checkbox; any already-committed per-game suppression stays.
  const dismissEndTurnConfirm = () => {
    setEndTurnConfirm(false);
    setDontWarnThisGame(false);
  };
  // "End turn anyway": commit the per-game suppression if the box is ticked,
  // then proceed. Reads the current `dontWarnThisGame` before the state reset.
  const confirmEndTurnAnyway = () => {
    if (dontWarnThisGame) setSuppressEndTurnWarning(true);
    dismissEndTurnConfirm();
    doEndTurn();
  };

  const undoMove = () => {
    if (!isViewerActive || ended) return;
    if (!state.undoBuffer) return;
    dispatch({ type: 'UNDO_MOVE' });
  };

  // Sync the tutorial pref with local state so dismissing writes the flag.
  const dismissTutorial = () => {
    setShowTutorial(false);
    setPrefs({ tutorial: 'dismissed' });
  };

  const confirmPass = () => {
    const pending = state.pendingPassSeatIdx;
    if (pending === null) return;
    const seat = state.seats.find((x) => x.idx === pending);
    if (!seat) return;
    // Game state transition is a single CONFIRM_PASS action. Side effects
    // (viewer switch, cursor reset, focus) live outside the reducer since
    // they're UI-only concerns.
    dispatch({ type: 'CONFIRM_PASS' });
    setOpenCityId(null);
    setHoveredHex(null);
    setViewerFactionId(seat.factionId);
    const c = state.cities.find((x) => x.faction === seat.factionId);
    if (c) { inspectCursor(c); centerHex(c, 2); }
    setShowTutorial(false);
    setTimeout(() => boardRef.current?.focus?.(), 0);
  };

  const cancelTargeting = () => dispatch({ type: 'CANCEL_TARGETING' });

  // Latest-handler refs so the keyboard effect (mounted once) always calls
  // the current closures without re-binding the listener every render.
  // Selection now lives on GameState, so the keyboard effect can read it
  // directly from stateRef.current.selectedUnitId; no separate selectedRef
  // is needed. Ditto for pendingPassSeatIdx.
  const endTurnRef = useRef<() => void>(endTurn);
  const handleHexActivateRef = useRef<(q: number, r: number) => void>(handleHexActivate);
  const stateRef = useRef<GameState>(state);
  const cursorRef = useRef<Hex>(cursor);
  const activeRef = useRef<boolean>(isViewerActive);
  const endedRef = useRef<boolean>(ended);
  const cityRef = useRef<boolean>(openCityId !== null);
  useEffect(() => {
    keyboardInspect.current = inspectCursor;
    endTurnRef.current = endTurn;
    handleHexActivateRef.current = handleHexActivate;
    stateRef.current = state;
    cursorRef.current = cursor;
    activeRef.current = isViewerActive;
    endedRef.current = ended;
    cityRef.current = openCityId !== null;
  });

  // -- Keyboard handling on the board (and globally for shortcuts) --
  // The handler is mounted once and reads the latest closures via refs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (document.querySelector('[aria-modal="true"]') ||
          target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (stateRef.current.pendingPassSeatIdx !== null) return;

      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey) {
        if (activeRef.current && !endedRef.current) { e.preventDefault(); endTurnRef.current(); return; }
      }
      // Ctrl/Cmd + Z → undo last move. Only while a valid undo exists.
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        if (activeRef.current && !endedRef.current && stateRef.current.undoBuffer) {
          e.preventDefault();
          dispatch({ type: 'UNDO_MOVE' });
          return;
        }
      }
      if (e.key === '?') { e.preventDefault(); setShowHelp(true); return; }
      if (e.key === 'Escape') {
        if (stateRef.current.targeting) { dispatch({ type: 'CANCEL_TARGETING' }); return; }
        if (stateRef.current.selectedUnitId !== null) { dispatch({ type: 'SELECT_UNIT', unitId: null }); return; }
        if (cityRef.current) { setOpenCityId(null); return; }
      }
      if (document.activeElement === boardRef.current) {
        const dir = HEX_NAV[e.key];
        if (dir) {
          e.preventDefault();
          const c = cursorRef.current;
          const next = { q: c.q + dir.q, r: c.r + dir.r };
          if (stateRef.current.map[hexKey(next.q, next.r)]) keyboardInspect.current(next);
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

  // -- localStorage autosave. Debounced at 200ms to avoid writing the full
  // ~100KB GameState blob on every pointer event during unit selection or
  // cursor movement. On game-end we drop the save entirely. On unmount we
  // flush any pending write so a close-tab during the debounce window
  // doesn't lose the last meaningful action.
  useEffect(() => {
    if (state.status === 'ended') {
      clearSave();
      return;
    }
    debouncedSaveGame(state,setSaved);
  }, [state]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushPendingSave(); };
    window.addEventListener('pagehide',flushPendingSave);
    document.addEventListener('visibilitychange',onVisibility);
    return () => {
      window.removeEventListener('pagehide',flushPendingSave);
      document.removeEventListener('visibilitychange',onVisibility);
      flushPendingSave();
    };
  }, []);

  // Render-time computed values
  const selectedUnitObj = state.units.find((u) => u.id === selectedUnit && u.faction === viewerFactionId);
  const viewer = state.factions[viewerFactionId];
  const openCity = openCityId !== null
    ? state.cities.find((c) => c.id === openCityId && c.faction === viewerFactionId)
    : undefined;
  const selectedUnitCity = selectedUnitObj
    ? state.cities.find((c) => c.q === selectedUnitObj.q && c.r === selectedUnitObj.r)
    : undefined;
  const hasSelectedFriendlyUnitAndFriendlyCity = !!(selectedUnitObj && selectedUnitObj.faction === viewerFactionId && selectedUnitCity?.faction === viewerFactionId);
  const canManageOpenCity = !!openCity && openCity.faction === viewerFactionId && isViewerActive;
  const maxOrders = nextOrders(viewer);
  const income = turnIncome(state, viewer);
  const ready = useMemo(() => readyUnits(state, viewerFactionId), [state, viewerFactionId]);
  const readyIds = new Set(ready.map(u => u.id));
  const inspected = hoveredHex ?? hexKey(cursor.q, cursor.r);
  const pendingHex = pending?.state === state ? pending.hex : null;
  const inspectKey = pendingHex ? hexKey(pendingHex.q, pendingHex.r) : inspected;
  const inspectionAttack = attackTargets.find(t => hexKey(t.target.q, t.target.r) === inspectKey);
  const visibleLog = state.log.filter(e => (e.faction === viewerFactionId || e.faction === 'system') &&
    (!e.hex || viewer.explored.has(hexKey(e.hex.q,e.hex.r)))).slice().reverse();
  const focusHex = (hex: Hex) => { inspectCursor(hex); centerHex(hex, Math.max(zoom, 1.75)); };
  const cycleReady = () => {
    if (!ready.length) return;
    const next = ready[(ready.findIndex(u => u.id === selectedUnit) + 1) % ready.length];
    setSelectedUnit(next.id); focusHex(next); setSheetOpen(true);
  };
  const passSeat = state.pendingPassSeatIdx !== null ? state.seats.find((s) => s.idx === state.pendingPassSeatIdx) : null;
  const passFaction = passSeat ? state.factions[passSeat.factionId] : null;

  if (passSeat && passFaction) return <PassDeviceModal open seatName={passSeat.name} factionName={passFaction.name}
    factionGlyph={<Emblem kind={passFaction.factionPresetId}/>} factionColor={passFaction.color} onReady={confirmPass}/>;

  return (
    <div style={{'--faction-trim':viewer.color} as CSSProperties} className="campaign w-full min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 text-stone-800">
      <div className="max-w-7xl mx-auto p-3">
        <header data-tour="goal" className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <span className="royal-seal"><Emblem kind={viewer.factionPresetId} size={32}/></span>
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-stone-900">Helmets Clash</h1>
              <div className="text-xs text-stone-700 -mt-1">Turn {state.turn} · {activeFaction?.displayName || 'Unknown'} · {viewer.name}{!isViewerActive && ' (waiting)'}</div>
            </div>
          </div>
          <nav aria-label="Main controls" className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-lg px-4 py-2 shadow-sm border border-stone-300">
            <Stat icon={<Coins size={18} className="text-amber-700" aria-hidden="true" />} label="Gold" value={viewer?.gold ?? 0} />
            <Stat icon={<Wheat size={18} className="text-yellow-800" aria-hidden="true" />} label="Food" value={viewer?.food ?? 0} />
            <Stat icon={<Sparkles size={18} className="text-indigo-700" aria-hidden="true" />} label="Orders" value={`${viewer?.orders ?? 0}/${maxOrders}`} />
            <button className="ready-control" onClick={cycleReady} disabled={!ready.length || !isViewerActive || !!state.targeting}
              title="Next ready unit" aria-label={`Next ready unit (${ready.length} ready)`}>{ready.length} ready <span aria-hidden="true">›</span></button>
            <div className="h-8 w-px bg-stone-300" aria-hidden="true" />
            <button
              type="button"
              data-tour="end" onClick={endTurn}
              disabled={!isViewerActive || ended}
              aria-keyshortcuts="E"
              className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 disabled:text-stone-600 text-white font-semibold px-4 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition"
            >
              End Turn (E)
            </button>
            <button
              type="button"
              onClick={undoMove}
              disabled={!isViewerActive || ended || !state.undoBuffer}
              aria-label="Undo last move"
              aria-keyshortcuts="Control+Z"
              className="text-stone-700 hover:text-stone-900 disabled:text-stone-400 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Undo2 size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              aria-label="Open tutorial"
              className="text-stone-700 hover:text-stone-900 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <BookOpen size={20} aria-hidden="true" />
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
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
              className="text-stone-700 hover:text-stone-900 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Settings size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onExit('menu')}
              aria-label="Exit to main menu"
              className="text-stone-700 hover:text-stone-900 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </nav>
        </header>
        {!saved && !ended && <div role="status" className="save-warning">
          Game couldn't be saved on this device. <button onClick={() => {
            debouncedSaveGame(state,setSaved);
            flushPendingSave();
          }}>Retry</button>
        </div>}
        {!!viewer.recap?.length && <details className="turn-recap" key={`${viewer.id}-${state.turn}`}>
          <summary>Since your last turn · {viewer.recap.length + (viewer.earlierHits ?? 0)} {viewer.recap.length === 1 && !viewer.earlierHits ? 'hit' : 'hits'}</summary>
          {Boolean(viewer.earlierHits) && <p>{viewer.earlierHits} earlier hits.</p>}
          <ul>{viewer.recap.map((hit,i) => <li key={i}>{hit.subject} at ({hit.q}, {hit.r}) lost {hit.amount} HP{hit.destroyed ? ' and fell' : ''}.</li>)}</ul>
        </details>}

        <div className="battle-layout">
          <div className="board-frame">
            {state.targeting && (
              <div className="flex items-center justify-between gap-3 bg-indigo-900 text-white px-4" role="status">
                <span className="text-sm"><b>{state.targeting.card.name}</b> · {targetLabels[state.targeting.card.target]}</span>
                <button type="button" onClick={cancelTargeting} className="hover:text-red-200 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Cancel</button>
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
              reducedMotion={reducedMotion}
              boardRef={boardRef}
              zoom={zoom}
              view={view} onPan={p => setPan(boardView(bounds, zoom, p).pan)} ready={readyIds}
              onTouchInspect={(q, r) => {
                const friendly = state.units.some(u => u.faction === viewerFactionId && u.q === q && u.r === r);
                if (state.targeting || (selectedUnitObj && !friendly)) {
                  setPending({ state, hex: { q, r } }); setSheetOpen(true);
                } else handleHexActivate(q, r);
              }}
            />
            {/* Zoom controls — absolute-positioned over the top-right of
                the board. Keyboard-accessible via tab + Enter. */}
            <div className="map-tools">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="px-2 py-1 text-sm font-bold text-stone-800 hover:bg-amber-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >+</button>
              <button
                type="button"
                aria-label="Reset zoom and pan"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="px-2 py-0.5 text-[10px] text-stone-700 hover:bg-amber-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >Fit board</button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                className="px-2 py-1 text-sm font-bold text-stone-800 hover:bg-amber-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >−</button>
              <button onClick={() => focusHex(selectedUnitObj ?? openCity ?? state.cities.find(c => c.faction === viewerFactionId) ?? cursor)}>Center {selectedUnitObj ? 'unit' : 'city'}</button>
            </div>
          </div>

          <aside aria-label="Side panel" className="inspection-sheet">
            <button className="sheet-toggle" aria-expanded={sheetOpen} aria-controls="inspection-content" onClick={() => setSheetOpen(!sheetOpen)}>Inspector · {sheetOpen ? 'Hide' : 'Show'}</button>
            <div id="inspection-content" className={sheetOpen ? 'inspection-content' : 'inspection-content collapsed'}>
            <InfoPanel selectedUnit={selectedUnitObj} state={state} viewer={viewer} hoveredKey={inspectKey}
              moveCost={moveRange.get(inspectKey)} attack={inspectionAttack} />
            {pendingHex && <div className="confirm-actions">
              <button onClick={() => handleHexActivate(pendingHex.q,pendingHex.r)}
                disabled={state.targeting ? !cardDestination(state,viewerFactionId,state.targeting.card,pendingHex.q,pendingHex.r) : viewer.explored.has(inspectKey) && !inspectionAttack && !moveRange.has(inspectKey)}>
                Confirm {state.targeting ? state.targeting.card.name : !viewer.explored.has(inspectKey) ? 'action' : inspectionAttack ? 'attack' : 'move'}</button>
              <button onClick={() => setPending(null)}>Cancel preview</button></div>}
            {hasSelectedFriendlyUnitAndFriendlyCity && selectedUnitCity && (
              <section aria-labelledby="stacked-city-heading" className="bg-white/85 backdrop-blur rounded-lg border border-stone-300 p-3 shadow-sm">
                <h2 id="stacked-city-heading" className="text-xs uppercase tracking-wider text-stone-700 mb-2 font-semibold">
                  Tile actions
                </h2>
                <p className="text-xs text-stone-700 mb-2">
                  This tile has both your selected unit and your city.
                </p>
                <button
                  type="button"
                  onClick={() => setOpenCityId(selectedUnitCity.id)}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-3 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  aria-label={`Open city ${selectedUnitCity.name} management (unit and city share this tile)`}
                >
                  Open city
                </button>
              </section>
            )}

            <details className="table-panel"><summary>If you end now</summary>
              <p>Income: +{income.goldGain} gold, +{income.foodGain} food. Healing: {income.cityHealing} city HP, {[...income.unitHealing.values()].reduce((sum,n) => sum+n,0)} unit HP.</p>
              <p>If your holdings and hand stay as they are, next turn refreshes to {maxOrders} Orders and draws {nextDraw(viewer)} cards.</p>
            </details>
            <details className="table-panel"><summary><Hammer size={16}/> Structures ({viewer.buildings.size})</summary>
              {viewer && viewer.buildings.size === 0 ? (
                <div className="text-xs text-stone-700 italic">None yet. Activate your city to build.</div>
              ) : (
                <ul className="space-y-1" role="list">
                  {viewer && Array.from(viewer.buildings).map((id) => (
                    <li key={id} className="flex items-center gap-2 text-xs">
                      <span aria-hidden="true" className="text-base"><Hammer size={14}/></span>
                      <span className="font-semibold">{BUILDINGS[id].name}</span>
                      <span className="text-stone-700 text-[10px]">· {BUILDINGS[id].desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <details className="table-panel"><summary>Chronicle</summary>
              {visibleLog[0] && <p className="recent-event"><b>Latest · Turn {visibleLog[0].turn}</b><br/>{visibleLog[0].text}</p>}
              <ol className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {visibleLog.map((entry, i) => {
                  const base = entry.faction === 'system' ? 'text-stone-700 italic' : 'text-stone-900';
                  // Entries carrying a hex coord render as buttons that
                  // center the keyboard cursor on that hex — turns the log
                  // into a combat-navigation tool.
                  if (entry.hex) {
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => { if (entry.hex) focusHex(entry.hex); boardRef.current?.focus?.(); }}
                          className={`text-left w-full hover:bg-stone-100 rounded px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${base}`}
                          title="Jump to this hex"
                        >
                          <span className="text-stone-500">T{entry.turn}:</span> {entry.text}
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={i} className={`px-1 ${base}`}>
                      <span className="text-stone-500">T{entry.turn}:</span> {entry.text}
                    </li>
                  );
                })}
              </ol>
            </details>
            </div>
          </aside>

        <HandBar
          selected={state.targeting?.card.uid} faction={viewer}
          canPlay={!state.targeting && !ended}
          isViewerActive={isViewerActive}
          onPlayCard={playCard}
        />

        </div>
        <ActionFeedback key={viewerFactionId} state={state} viewer={viewerFactionId}/>
        {/* Status footer */}
        <footer className="mt-3 text-xs text-stone-700 text-center">
          Map: {state.config.resolvedMapType || state.config.mapType} · {state.mapCols}×{state.mapRows} · Seed {state.config.seed} · {Object.values(state.factions).length} factions
        </footer>
      </div>

      <CityModal state={state}
        open={!!openCity}
        onClose={() => setOpenCityId(null)}
        city={openCity}
        faction={openCity ? state.factions[openCity.faction] : undefined}
        canAct={canManageOpenCity}
        onRecruit={recruitUnit}
        onBuild={constructBuilding}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <EndScreen
        open={ended}
        winner={state.winner}
        faction={state.winner ? state.factions[state.winner] : null}
        turn={state.turn}
        state={state}
        onNewGame={() => onExit('replay')}
        onMainMenu={() => onExit('menu')}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        prefs={prefs}
        setPrefs={setPrefs}
      />

      <TutorialOverlay open={showTutorial} onDismiss={dismissTutorial} />

      {/* End-Turn confirmation. Only renders when requested; wraps Dialog
          via inline JSX to keep the single-use copy co-located. */}
      {endTurnConfirm && (
        <Dialog open onClose={dismissEndTurnConfirm} title="End turn?" labelledById="endturn-confirm-title" maxWidth="max-w-sm">
            <p className="text-sm text-stone-800 mb-4">
              You still have units that haven't moved. Are you sure you want to end your turn?
            </p>
            <label className="flex items-start gap-2 mb-4 text-sm text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={dontWarnThisGame}
                onChange={(e) => setDontWarnThisGame(e.target.checked)}
                className="mt-0.5"
              />
              <span>Don't warn me again this game</span>
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={dismissEndTurnConfirm}
                className="bg-stone-200 hover:bg-stone-300 text-stone-900 font-semibold px-4 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Keep playing
              </button>
              <button
                type="button"
                onClick={confirmEndTurnAnyway}
                autoFocus
                className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                End turn anyway
              </button>
            </div>
        </Dialog>
      )}

      {/* Turn banner — re-mounts on (turn, activeSeatIdx) so it fires
          on every rotation. Respects prefers-reduced-motion. */}
      {activeSeat && activeFaction && !state.pendingPassSeatIdx && (
        <TurnBanner
          key={`${state.turn}-${state.activeSeatIdx}`}
          turn={state.turn}
          factionName={activeFaction.displayName}
          factionGlyph={<Emblem kind={activeFaction.factionPresetId}/>}
          factionColor={activeFaction.color}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
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

// cloneShallow used to live here for the inline setState updaters. All
// state transitions now go through src/game/reducer.ts, which owns its
// own clone helper. Keep this file focused on UI orchestration.

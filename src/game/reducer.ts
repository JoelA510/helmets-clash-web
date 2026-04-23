import type {
  AttackTarget, BuildingId, Card, FactionId, GameState, UnitType,
} from './types';
import { applyEndOfSeatTurn, applyStartOfSeatTurn, nextLivingSeat } from './turn';
import { checkVictory } from './state';
import { runAITurnFor } from './ai';
import {
  performBuild, performMove, performPlayerAttack,
  performPlayTargetedCard, performPlayUntargetedCard, performRecruit,
} from '../ui/gameActions';

// --- Actions ---
//
// Every state transition the game performs is represented by a tagged action
// here. GameScreen dispatches these; the reducer is a pure function of
// (state, action) → state. This replaces the previous mix of inline
// `setState(prev => ...)` updaters in GameScreen plus direct calls to the
// game-module helpers — one dispatch entry point, one canonical shape for
// each transition, trivially unit-testable.

export type GameAction =
  | { type: 'SELECT_UNIT_FROM_HEX'; q: number; r: number }
  | { type: 'MOVE_UNIT'; unitId: number; q: number; r: number; moveCost: number }
  | { type: 'ATTACK'; attackerId: number; target: AttackTarget }
  | { type: 'RECRUIT'; factionId: FactionId; unitType: UnitType }
  | { type: 'BUILD'; factionId: FactionId; building: BuildingId }
  | { type: 'PLAY_CARD_UNTARGETED'; factionId: FactionId; card: Card }
  | { type: 'PLAY_CARD_TARGETED'; factionId: FactionId; card: Card; q: number; r: number }
  | { type: 'BEGIN_TARGETING'; card: Card }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'END_TURN'; viewerFactionId: FactionId }
  | { type: 'CONFIRM_PASS' }
  | { type: 'APPLY_START_OF_TURN_FOR_SEAT'; seatIdx: number };

// Shallow-clone game state preserving Sets. Kept here because the reducer is
// the only non-test place that does this kind of deep-ish clone now; the
// gameActions helpers produce their own new state objects internally.
const cloneShallow = (s: GameState): GameState => {
  const factions = {} as GameState['factions'];
  for (const [k, v] of Object.entries(s.factions) as Array<[FactionId, GameState['factions'][FactionId]]>) {
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
};

// --- END_TURN handler ---
//
// Extracts the nested AI-advancement loop that previously lived inline in
// GameScreen.endTurn. Guards entirely on `prev` (no closure deps). Writes
// `pendingPassSeatIdx` onto state rather than a separate piece of UI state.
const endTurnTransition = (prev: GameState, viewerFactionId: FactionId): GameState => {
  if (prev.status === 'ended') return prev;
  const prevActive = prev.seats.find((x) => x.idx === prev.activeSeatIdx);
  if (!prevActive) return prev;
  const prevFaction = prev.factions[prevActive.factionId];
  // Outer UI guard already checks isViewerActive; this is defense-in-depth.
  if (!prevFaction || prevFaction.kind !== 'human' || prevActive.factionId !== viewerFactionId) {
    return prev;
  }

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
    // Crossing a turn boundary: the next seat's idx wraps to or below the
    // seat we just ended.
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
      s.pendingPassSeatIdx = next.idx;
    } else {
      applyStartOfSeatTurn(s, next.factionId);
    }
    break;
  }
  return s;
};

// --- CONFIRM_PASS handler ---
//
// Resolves the pending seat, runs its start-of-turn housekeeping, clears
// the gate. Pure function of state.
const confirmPassTransition = (prev: GameState): GameState => {
  const pending = prev.pendingPassSeatIdx;
  if (pending === null) return prev;
  const seat = prev.seats.find((x) => x.idx === pending);
  if (!seat) return prev;
  const s = cloneShallow(prev);
  applyStartOfSeatTurn(s, seat.factionId);
  s.pendingPassSeatIdx = null;
  return s;
};

// --- Reducer ---

export const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SELECT_UNIT_FROM_HEX': {
      // Selection is UI state (held in GameScreen's local useState); the
      // reducer only owns canonical game state. This action is a no-op
      // here — dispatched for symmetry / future migration. Included in
      // the type so exhaustive switches compile.
      return state;
    }
    case 'MOVE_UNIT':
      return performMove(state, action.unitId, action.q, action.r, action.moveCost);
    case 'ATTACK':
      return performPlayerAttack(state, action.attackerId, action.target);
    case 'RECRUIT':
      return performRecruit(state, action.factionId, action.unitType);
    case 'BUILD':
      return performBuild(state, action.factionId, action.building);
    case 'PLAY_CARD_UNTARGETED':
      return performPlayUntargetedCard(state, action.factionId, action.card);
    case 'PLAY_CARD_TARGETED': {
      const { state: next } = performPlayTargetedCard(state, action.factionId, action.card, action.q, action.r);
      return next;
    }
    case 'BEGIN_TARGETING':
      return { ...state, targeting: { card: action.card } };
    case 'CANCEL_TARGETING':
      return { ...state, targeting: null };
    case 'END_TURN':
      return endTurnTransition(state, action.viewerFactionId);
    case 'CONFIRM_PASS':
      return confirmPassTransition(state);
    case 'APPLY_START_OF_TURN_FOR_SEAT': {
      const seat = state.seats.find((x) => x.idx === action.seatIdx);
      if (!seat) return state;
      const s = cloneShallow(state);
      applyStartOfSeatTurn(s, seat.factionId);
      return s;
    }
  }
};

import type {
  AttackTarget, BuildingId, Card, FactionId, GameState, UnitType,
} from './types';
import { applyEndOfSeatTurn, applyStartOfSeatTurn, nextLivingSeat } from './turn';
import { checkVictory } from './state';
import { runAITurnFor } from './ai';
import { cloneGameState } from './clone';
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
  | { type: 'SELECT_UNIT'; unitId: number | null }
  | { type: 'MOVE_UNIT'; unitId: number; q: number; r: number; moveCost: number }
  | { type: 'ATTACK'; attackerId: number; target: AttackTarget }
  | { type: 'RECRUIT'; factionId: FactionId; unitType: UnitType }
  | { type: 'BUILD'; factionId: FactionId; building: BuildingId }
  | { type: 'PLAY_CARD_UNTARGETED'; factionId: FactionId; card: Card }
  | { type: 'PLAY_CARD_TARGETED'; factionId: FactionId; card: Card; q: number; r: number }
  | { type: 'BEGIN_TARGETING'; card: Card }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'END_TURN'; viewerFactionId: FactionId }
  | { type: 'CONFIRM_PASS' };

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

  const s = cloneGameState(prev);
  applyEndOfSeatTurn(s, prevActive.factionId);

  // Advance through AI seats until we either reach a human or end.
  // `safety` caps the loop at 2× seat count — a full double-rotation
  // upper bound. Scales with future seat-cap increases without needing
  // a magic number update.
  let safety = prev.seats.length * 2;
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
  const s = cloneGameState(prev);
  applyStartOfSeatTurn(s, seat.factionId);
  s.pendingPassSeatIdx = null;
  return s;
};

// --- Reducer ---

export const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SELECT_UNIT':
      return { ...state, selectedUnitId: action.unitId };
    case 'MOVE_UNIT':
      return performMove(state, action.unitId, action.q, action.r, action.moveCost);
    case 'ATTACK': {
      // Attack clears the selection — the attacker either died or spent
      // its turn, so there's nothing useful to do with it next. If the
      // helper rejected the attack (returned `state` unchanged), preserve
      // identity so callers using `toBe`/shallow compare don't see churn.
      const next = performPlayerAttack(state, action.attackerId, action.target);
      return next === state ? state : { ...next, selectedUnitId: null };
    }
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
    case 'END_TURN': {
      // End turn implicitly clears selection. Preserve identity when the
      // guard inside endTurnTransition rejects the action.
      const next = endTurnTransition(state, action.viewerFactionId);
      return next === state ? state : { ...next, selectedUnitId: null };
    }
    case 'CONFIRM_PASS': {
      const next = confirmPassTransition(state);
      return next === state ? state : { ...next, selectedUnitId: null };
    }
  }
};

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
  | { type: 'UNDO_MOVE' }
  | { type: 'ATTACK'; attackerId: number; target: AttackTarget }
  | { type: 'RECRUIT'; factionId: FactionId; unitType: UnitType }
  | { type: 'BUILD'; factionId: FactionId; building: BuildingId }
  | { type: 'PLAY_CARD_UNTARGETED'; factionId: FactionId; card: Card }
  | { type: 'PLAY_CARD_TARGETED'; factionId: FactionId; card: Card; q: number; r: number }
  | { type: 'BEGIN_TARGETING'; card: Card }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'END_TURN'; viewerFactionId: FactionId }
  | { type: 'CONFIRM_PASS' };

// --- AI advancement ---
//
// Mutates `s` (a clone the caller owns): starting after the active seat,
// whose turn has just ended, runs each AI seat's whole turn
// until a human seat is up or the game ends. With `gateHumans`, reaching a
// human when more than one human plays raises the pass-device gate instead
// of starting their turn; without it, the human's turn starts directly.
const advancePastAISeats = (s: GameState, gateHumans: boolean): void => {
  // `safety` caps the loop at 2× seat count — a full double-rotation
  // upper bound. Scales with future seat-cap increases without needing
  // a magic number update.
  let safety = s.seats.length * 2;
  while (safety-- > 0) {
    const v = checkVictory(s);
    if (v.status === 'ended') {
      s.status = 'ended';
      s.winner = v.winner;
      break;
    }
    const from = s.activeSeatIdx;
    const next = nextLivingSeat(s, from);
    if (!next) break;
    s.activeSeatIdx = next.idx;
    // Crossing a turn boundary: this step wrapped to a seat at or below the
    // one it left. Compared per step, not against the seat that ended the
    // turn, so a rotation that passes several seats counts once.
    if (next.idx <= from) s.turn += 1;

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
    if (gateHumans && humanCount > 1) {
      s.pendingPassSeatIdx = next.idx;
    } else {
      applyStartOfSeatTurn(s, next.factionId);
    }
    break;
  }
};

// --- Opening AI turns ---
//
// A game can open with an AI seat active (seat 1 is AI), and a save made
// before this existed can resume with one. Nothing else runs an AI turn
// except a human's End Turn, so play the AI seats now, up to the first
// human. No pass-device gate: no human has played yet, and GameScreen's
// viewer already starts as the first human seat. A game with no human seat
// is returned unchanged (setup no longer allows one; see spec §2.1).
export const playOpeningAITurns = (state: GameState): GameState => {
  if (state.status === 'ended' || state.pendingPassSeatIdx !== null) return state;
  const seat = state.seats.find((x) => x.idx === state.activeSeatIdx);
  if (!seat || state.factions[seat.factionId]?.kind !== 'ai') return state;
  if (!Object.values(state.factions).some((f) => f.kind === 'human')) return state;
  const s = cloneGameState(state);
  // The active seat's start-of-turn housekeeping already ran (initialState
  // applies it to the opening seat), so only its actions and end remain.
  runAITurnFor(s, seat.factionId);
  applyEndOfSeatTurn(s, seat.factionId);
  advancePastAISeats(s, false);
  return s;
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

  const s = cloneGameState(prev);
  applyEndOfSeatTurn(s, prevActive.factionId);
  advancePastAISeats(s, true);
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
    case 'UNDO_MOVE': {
      // Restore the pre-move snapshot captured by performMove. Only valid
      // while the undo buffer is populated; a no-op otherwise.
      const buf = state.undoBuffer;
      if (!buf) return state;
      const units = state.units.map((u) => {
        if (u.id !== buf.unitId) return u;
        return { ...u, q: buf.q, r: buf.r, moved: buf.moved };
      });
      const factions = { ...state.factions };
      const u = state.units.find((x) => x.id === buf.unitId);
      if (u) {
        const f = factions[u.faction];
        factions[u.faction] = {
          ...f,
          buildings: new Set(f.buildings),
          explored: new Set(buf.explored),
        };
      }
      return { ...state, units, factions, undoBuffer: null };
    }
    case 'ATTACK': {
      // Attack clears the selection AND the undo buffer — once you've
      // committed damage to an enemy, you can't revert the move that got
      // you there.
      const next = performPlayerAttack(state, action.attackerId, action.target);
      return next === state ? state : { ...next, selectedUnitId: null, undoBuffer: null };
    }
    case 'RECRUIT':
      return { ...performRecruit(state, action.factionId, action.unitType), undoBuffer: null };
    case 'BUILD':
      return { ...performBuild(state, action.factionId, action.building), undoBuffer: null };
    case 'PLAY_CARD_UNTARGETED':
      return { ...performPlayUntargetedCard(state, action.factionId, action.card), undoBuffer: null };
    case 'PLAY_CARD_TARGETED': {
      const { state: next } = performPlayTargetedCard(state, action.factionId, action.card, action.q, action.r);
      return { ...next, undoBuffer: null };
    }
    case 'BEGIN_TARGETING':
      return { ...state, targeting: { card: action.card } };
    case 'CANCEL_TARGETING':
      return { ...state, targeting: null };
    case 'END_TURN': {
      // End turn implicitly clears selection and the undo buffer.
      // Preserve identity when the guard inside endTurnTransition
      // rejects the action.
      const next = endTurnTransition(state, action.viewerFactionId);
      return next === state ? state : { ...next, selectedUnitId: null, undoBuffer: null };
    }
    case 'CONFIRM_PASS': {
      const next = confirmPassTransition(state);
      return next === state ? state : { ...next, selectedUnitId: null, undoBuffer: null };
    }
  }
};

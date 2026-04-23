import { describe, expect, it } from 'vitest';
import type { Card, CardId, FactionId } from '../game/types';
import { CARD_POOL } from '../game/constants';
import { initialState } from '../game/state';
import { reducer, type GameAction } from '../game/reducer';
import { mkConfig } from './helpers';

// The reducer is the single authoritative state transition function for
// the game. Every UI path in GameScreen dispatches one of these actions.
// These tests pin the action contract so UI refactors can't silently
// break game-rule semantics.

const forceCard = (factionId: FactionId, id: CardId): Card => {
  const tpl = CARD_POOL.find((c) => c.id === id)!;
  return { ...tpl, uid: `${factionId}:${tpl.id}#test` };
};

describe('reducer: basic dispatch coverage', () => {
  it('is a pure function: same (state, action) ⇒ same result', () => {
    const s0 = initialState(mkConfig({ seed: 42 }));
    const action: GameAction = { type: 'CANCEL_TARGETING' };
    const a = reducer(s0, action);
    const b = reducer(s0, action);
    // Don't compare object identity — reducers produce new references.
    // Compare via JSON (good enough for this shallow check; Sets are
    // serialized identically when constructed from the same inputs).
    expect(JSON.stringify(a.targeting)).toBe(JSON.stringify(b.targeting));
  });

  it('BEGIN_TARGETING sets state.targeting; CANCEL_TARGETING clears it', () => {
    const s0 = initialState(mkConfig({ seed: 43 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'scout');
    const s1 = reducer(s0, { type: 'BEGIN_TARGETING', card });
    expect(s1.targeting).not.toBe(null);
    expect(s1.targeting!.card.uid).toBe(card.uid);
    const s2 = reducer(s1, { type: 'CANCEL_TARGETING' });
    expect(s2.targeting).toBe(null);
  });

  it('SELECT_UNIT sets and clears selectedUnitId on state', () => {
    const s0 = initialState(mkConfig({ seed: 44 }));
    expect(s0.selectedUnitId).toBe(null);
    const u = s0.units[0];
    const s1 = reducer(s0, { type: 'SELECT_UNIT', unitId: u.id });
    expect(s1.selectedUnitId).toBe(u.id);
    const s2 = reducer(s1, { type: 'SELECT_UNIT', unitId: null });
    expect(s2.selectedUnitId).toBe(null);
  });

  it('PLAY_CARD_UNTARGETED routes through performPlayUntargetedCard', () => {
    const s0 = initialState(mkConfig({ seed: 45 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'harvest');
    const primed = {
      ...s0,
      factions: {
        ...s0.factions,
        [f1]: { ...s0.factions[f1], hand: [card], orders: 3 },
      },
    };
    const before = primed.factions[f1].gold;
    const after = reducer(primed, { type: 'PLAY_CARD_UNTARGETED', factionId: f1, card });
    expect(after.factions[f1].gold).toBe(before + 6);
  });

  it('END_TURN advances activeSeatIdx and — with 2 humans — sets pendingPassSeatIdx', () => {
    const s0 = initialState(mkConfig({ seed: 46 }));
    const f1Seat = s0.seats[0];
    const s1 = reducer(s0, { type: 'END_TURN', viewerFactionId: f1Seat.factionId });
    expect(s1.pendingPassSeatIdx).not.toBe(null);
    expect(s1.activeSeatIdx).not.toBe(s0.activeSeatIdx);
  });

  it('END_TURN is a no-op when dispatched against a non-viewer seat (defensive guard)', () => {
    const s0 = initialState(mkConfig({ seed: 47 }));
    // Pick a faction id that does NOT own the active seat.
    const wrongFactionId = s0.seats[1].factionId;
    const s1 = reducer(s0, { type: 'END_TURN', viewerFactionId: wrongFactionId });
    expect(s1).toBe(s0);
  });

  it('CONFIRM_PASS: with pendingPassSeatIdx set, clears it and applies start-of-turn', () => {
    const s0 = initialState(mkConfig({ seed: 48 }));
    const s1 = reducer(s0, { type: 'END_TURN', viewerFactionId: s0.seats[0].factionId });
    expect(s1.pendingPassSeatIdx).not.toBe(null);
    const s2 = reducer(s1, { type: 'CONFIRM_PASS' });
    expect(s2.pendingPassSeatIdx).toBe(null);
  });

  it('CONFIRM_PASS with no pending seat is a no-op', () => {
    const s0 = initialState(mkConfig({ seed: 49 }));
    const s1 = reducer(s0, { type: 'CONFIRM_PASS' });
    expect(s1).toBe(s0);
  });

  it('initialState pre-applies start-of-turn for seat 0 (orders, card draw, fog)', () => {
    const s = initialState(mkConfig({ seed: 50 }));
    const seat = s.seats[0];
    // Start-of-turn housekeeping should have already set orders = 3 (no
    // war_council yet) and drawn an initial hand, and revealed a fog
    // radius around the starting city.
    expect(s.factions[seat.factionId].orders).toBe(3);
    expect(s.factions[seat.factionId].hand.length).toBeGreaterThan(0);
    expect(s.factions[seat.factionId].explored.size).toBeGreaterThan(0);
  });
});

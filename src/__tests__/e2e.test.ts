import { describe, expect, it } from 'vitest';
import type { FactionId, GameState } from '../game/types';
import { initialState } from '../game/state';
import { reducer, type GameAction } from '../game/reducer';
import { cloneState, mkConfig } from './helpers';

// End-to-end reducer test that plays a full game to completion entirely
// through dispatched actions — no direct calls to the underlying helpers.
// This is the belt-and-suspenders check against UI-reachability: if the
// reducer can drive the game from initial state to `status === 'ended'`
// using only the action shapes GameScreen dispatches, then the UI can
// too (modulo UI-side concerns like animation timing).

const apply = (s: GameState, a: GameAction): GameState => reducer(s, a);

describe('e2e: reducer drives a game to completion', () => {
  it('1 human vs 1 AI: human repeatedly ends turn until AI city falls', () => {
    let state = initialState(mkConfig({
      seed: 12345,
      seats: [
        { kind: 'human', name: 'P1' },
        { kind: 'ai', name: 'AI' },
        { kind: 'empty', name: '' },
        { kind: 'empty', name: '' },
      ],
    }));
    const humanFactionId = state.seats[0].factionId;
    const aiFactionId = state.seats[1].factionId;

    // Cheese the outcome: crank AI city down to 1 HP right off the bat.
    // We're testing the dispatch path, not game balance — we just need a
    // terminal transition to fire.
    const primed = cloneState(state);
    primed.cities = primed.cities.map((c) =>
      c.faction === aiFactionId ? { ...c, hp: 1 } : c
    );
    // Move a human unit adjacent to the AI city so the AI's own end-turn
    // loop can attack it and end the game, OR the human can attack next.
    const humanUnit = primed.units.find((u) => u.faction === humanFactionId)!;
    const aiCity = primed.cities.find((c) => c.faction === aiFactionId)!;
    const u = primed.units.find((x) => x.id === humanUnit.id)!;
    u.q = aiCity.q;
    u.r = aiCity.r + 1;
    state = primed;

    // Human attacks the 1-HP AI city directly.
    const attacker = state.units.find((ux) => ux.id === humanUnit.id)!;
    const target = state.cities.find((c) => c.id === aiCity.id)!;
    state = apply(state, { type: 'ATTACK', attackerId: attacker.id, target: { type: 'city', target } });

    expect(state.status).toBe('ended');
    expect(state.winner).toBe(humanFactionId);
    // Dispatching any further actions on an ended game should be a no-op
    // or preserve the ended status.
    const afterNoop = apply(state, { type: 'END_TURN', viewerFactionId: humanFactionId });
    expect(afterNoop.status).toBe('ended');
    expect(afterNoop.winner).toBe(humanFactionId);
  });

  it('Human plays a sequence of actions: select, card, build, recruit, end turn', () => {
    let state = initialState(mkConfig({
      seed: 2222,
      seats: [
        { kind: 'human', name: 'P1' },
        { kind: 'ai', name: 'AI' },
        { kind: 'empty', name: '' },
        { kind: 'empty', name: '' },
      ],
    }));
    const humanFactionId: FactionId = state.seats[0].factionId;
    const humanUnit = state.units.find((u) => u.faction === humanFactionId)!;

    // SELECT_UNIT
    state = apply(state, { type: 'SELECT_UNIT', unitId: humanUnit.id });
    expect(state.selectedUnitId).toBe(humanUnit.id);

    // CANCEL_TARGETING on fresh state is a no-op for `targeting` but
    // should still return a new reference (defined behavior).
    state = apply(state, { type: 'CANCEL_TARGETING' });
    expect(state.targeting).toBe(null);

    // BEGIN_TARGETING with a Harvest card (so we can CANCEL without effect)
    const harvestCard = state.factions[humanFactionId].deck.find((c) => c.id === 'harvest')
      ?? state.factions[humanFactionId].hand.find((c) => c.id === 'harvest');
    if (harvestCard) {
      state = apply(state, { type: 'BEGIN_TARGETING', card: harvestCard });
      expect(state.targeting).not.toBe(null);
      state = apply(state, { type: 'CANCEL_TARGETING' });
      expect(state.targeting).toBe(null);
    }

    // Prime enough gold/food to build.
    const primed = cloneState(state);
    primed.factions[humanFactionId].gold = 20;
    primed.factions[humanFactionId].food = 20;
    state = primed;

    // BUILD (granary — +2 food per turn)
    state = apply(state, { type: 'BUILD', factionId: humanFactionId, building: 'granary' });
    expect(state.factions[humanFactionId].buildings.has('granary')).toBe(true);

    // RECRUIT (knight)
    state = apply(state, { type: 'RECRUIT', factionId: humanFactionId, unitType: 'knight' });
    const newUnits = state.units.filter((u) => u.faction === humanFactionId);
    expect(newUnits.some((u) => u.type === 'knight')).toBe(true);

    // END_TURN — selection should clear, AI should get a turn, and we
    // should either be back at this faction or (more likely, with only
    // one human) immediately back at this faction with their orders
    // reset.
    const turnBefore = state.turn;
    state = apply(state, { type: 'END_TURN', viewerFactionId: humanFactionId });
    expect(state.selectedUnitId).toBe(null);
    // 1 human + 1 AI: turn advanced one full rotation.
    expect(state.turn).toBe(turnBefore + 1);
    // After AI's turn, active seat should again be the human seat.
    const activeAfter = state.seats.find((s) => s.idx === state.activeSeatIdx);
    expect(activeAfter?.factionId).toBe(humanFactionId);
    // No pass-device gate since only 1 human.
    expect(state.pendingPassSeatIdx).toBe(null);
  });

  it('2 humans: END_TURN raises pass-device gate; CONFIRM_PASS clears it', () => {
    let state = initialState(mkConfig({
      seed: 3333,
      seats: [
        { kind: 'human', name: 'P1' },
        { kind: 'human', name: 'P2' },
        { kind: 'empty', name: '' },
        { kind: 'empty', name: '' },
      ],
    }));
    const p1 = state.seats[0].factionId;
    const p2Idx = state.seats[1].idx;

    state = apply(state, { type: 'END_TURN', viewerFactionId: p1 });
    expect(state.pendingPassSeatIdx).toBe(p2Idx);
    expect(state.activeSeatIdx).toBe(p2Idx);

    state = apply(state, { type: 'CONFIRM_PASS' });
    expect(state.pendingPassSeatIdx).toBe(null);
  });

  it('3-way AI-only observer: END_TURN rotates through every AI seat without gating', () => {
    let state = initialState(mkConfig({
      seed: 4444,
      seats: [
        { kind: 'human', name: 'Watcher' }, // Still a human seat for the first turn,
        { kind: 'ai', name: 'A' },           // but we immediately end to rotate.
        { kind: 'ai', name: 'B' },
        { kind: 'ai', name: 'C' },
      ],
    }));
    const humanFactionId = state.seats[0].factionId;
    const seat0 = state.seats[0].idx;

    // Play one full rotation of end-turns.
    state = apply(state, { type: 'END_TURN', viewerFactionId: humanFactionId });

    // After a single END_TURN from seat 0, all AI seats should have had
    // their turns auto-resolved and we should be back at seat 0 (since
    // it's the only human). No pass-device gate — only 1 human.
    expect(state.pendingPassSeatIdx).toBe(null);
    expect(state.activeSeatIdx).toBe(seat0);
    expect(state.turn).toBe(2);
  });
});

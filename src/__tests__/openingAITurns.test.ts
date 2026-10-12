import { describe, expect, it } from 'vitest';
import { initialState } from '../game/state';
import { playOpeningAITurns, reducer } from '../game/reducer';
import type { GameConfig } from '../game/types';
import { mkConfig } from './helpers';

const seats = (...kinds: Array<'human' | 'ai' | 'empty'>): GameConfig['seats'] =>
  kinds.map((kind, i) => ({ kind, name: kind === 'empty' ? '' : `${kind}-${i + 1}` }));

describe('playOpeningAITurns', () => {
  it('plays a leading AI seat before the first human, who starts turn 1 on their own turn', () => {
    const start = initialState(mkConfig({ seed: 7, seats: seats('ai', 'human', 'empty', 'empty') }));
    const [ai, human] = start.seats;
    expect(start.activeSeatIdx).toBe(ai.idx);

    const s = playOpeningAITurns(start);

    expect(s.activeSeatIdx).toBe(human.idx);
    expect(s.turn).toBe(1);
    expect(s.pendingPassSeatIdx).toBeNull();
    // The AI's turn ran to its end: end-of-turn income is logged for it.
    expect(s.log.some((e) => e.faction === ai.factionId && /gold/.test(e.text))).toBe(true);
    // The human's start-of-turn ran: a full set of orders.
    expect(s.factions[human.factionId].orders).toBe(3);
    // The input state is untouched (the reducer contract is pure).
    expect(start.activeSeatIdx).toBe(ai.idx);
  });

  it('plays every AI seat ahead of the first human, without a pass-device gate', () => {
    const start = initialState(mkConfig({ seed: 11, seats: seats('ai', 'ai', 'human', 'human') }));
    const s = playOpeningAITurns(start);
    expect(s.activeSeatIdx).toBe(start.seats[2].idx);
    expect(s.turn).toBe(1);
    expect(s.pendingPassSeatIdx).toBeNull();
    for (const ai of start.seats.slice(0, 2)) {
      expect(s.log.some((e) => e.faction === ai.factionId && /gold/.test(e.text))).toBe(true);
    }
  });

  it('plays the opening AI turns for a save from before pendingPassSeatIdx existed', () => {
    const start = initialState(mkConfig({ seed: 7, seats: seats('ai', 'human', 'empty', 'empty') }));
    // Such saves load without the field at all, not with null.
    const old: Partial<typeof start> = { ...start };
    delete old.pendingPassSeatIdx;
    const s = playOpeningAITurns(old as typeof start);
    expect(s.activeSeatIdx).toBe(start.seats[1].idx);
  });

  it('leaves a game that opens on a human seat unchanged', () => {
    const start = initialState(mkConfig({ seed: 7, seats: seats('human', 'ai', 'empty', 'empty') }));
    expect(playOpeningAITurns(start)).toBe(start);
  });

  it('leaves a game with no human seat unchanged rather than auto-playing it', () => {
    const start = initialState(mkConfig({ seed: 7, seats: seats('ai', 'ai', 'empty', 'empty') }));
    expect(playOpeningAITurns(start)).toBe(start);
  });

  it("hands play back to the AI on the human's End Turn, and the turn counter advances once", () => {
    const start = playOpeningAITurns(initialState(mkConfig({ seed: 7, seats: seats('ai', 'human', 'empty', 'empty') })));
    const human = start.seats[1];
    const s = reducer(start, { type: 'END_TURN', viewerFactionId: human.factionId });
    expect(s.activeSeatIdx).toBe(human.idx);
    expect(s.turn).toBe(2);
  });
});

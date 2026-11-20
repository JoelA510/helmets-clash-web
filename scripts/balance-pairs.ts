import { runAITurnFor } from '../src/game/ai';
import { UNIT_TYPES } from '../src/game/constants';
import { hexDistance } from '../src/game/hex';
import { checkVictory } from '../src/game/state';
import { applyEndOfSeatTurn, applyStartOfSeatTurn } from '../src/game/turn';
import type { GameState } from '../src/game/types';

type Side = 'f1' | 'f2';
const other = (id: Side) => id === 'f1' ? 'f2' : 'f1';

// The living presets have identical pieces. Exchange their deployment slots,
// including any terrain-limited placements, while preserving each seat's deal.
export function swapMirrorSpawns(state: GameState) {
  const [a, b] = state.cities;
  [a.q, b.q] = [b.q, a.q];
  [a.r, b.r] = [b.r, a.r];
  const {f1, f2} = state.factions;
  [f1.explored, f2.explored] = [f2.explored, f1.explored];
  for (const unit of state.units) unit.faction = unit.faction === 'f1' ? 'f2' : 'f1';
  state.units.sort((left, right) => left.faction.localeCompare(right.faction));
  state.units.forEach((unit, i) => { unit.id = i + 1; });
}

export function play(opening: GameState, first: Side, roundLimit = 100) {
  const s = structuredClone(opening);
  const order = [first, other(first)] as const;
  const firstCapitalHit: Partial<Record<Side, number>> = {};
  const firstInRange: Partial<Record<Side, number>> = {};
  for (let round = 1; round <= roundLimit; round++) {
    s.turn = round;
    for (const id of order) {
      s.activeSeatIdx = s.seats.find(seat => seat.factionId === id)!.idx;
      applyStartOfSeatTurn(s, id);
      const rival = other(id);
      const capital = s.cities.find(c => c.faction === rival)!;
      const hp = capital.hp;
      runAITurnFor(s, id);
      if (s.units.some(u => u.faction === id && hexDistance(u, capital) <= UNIT_TYPES[u.type].range)) {
        firstInRange[id] ??= round;
      }
      const remaining = s.cities.find(c => c.faction === rival)?.hp ?? 0;
      if (remaining < hp) firstCapitalHit[id] ??= round;
      applyEndOfSeatTurn(s, id);
      const {winner} = checkVictory(s);
      if (winner) return {winner, round, firstInRange, firstCapitalHit};
    }
  }
  return {winner: null, round: roundLimit, firstInRange, firstCapitalHit};
}

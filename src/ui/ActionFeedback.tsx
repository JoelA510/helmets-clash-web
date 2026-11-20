import { useEffect, useRef } from 'react';
import type { FactionId, GameState } from '../game/types';
import { UNIT_TYPES } from '../game/constants';
import { hexKey } from '../game/hex';

export function ActionFeedback({ state, viewer }: { state: GameState; viewer: FactionId }) {
  const previous = useRef(state);
  const output = useRef<HTMLOutputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    const el = output.current;
    if (!el || before === state) return;
    if (before.turn !== state.turn || before.activeSeatIdx !== state.activeSeatIdx) {
      el.textContent = '';
      return;
    }
    const facts: string[] = [];
    const latest = state.log.at(-1);
    if (latest && latest !== before.log.at(-1) && latest.faction === viewer &&
        (!latest.hex || state.factions[viewer].explored.has(hexKey(latest.hex.q, latest.hex.r)))) facts.push(latest.text);
    for (const u of before.units) {
      if (u.faction !== viewer && !before.factions[viewer].explored.has(hexKey(u.q,u.r))) continue;
      const after = state.units.find(v => v.id === u.id);
      if (after && u.faction === viewer && (after.q !== u.q || after.r !== u.r)) facts.push(`${UNIT_TYPES[u.type].name} moved to (${after.q}, ${after.r}).`);
      if ((after?.hp ?? 0) !== u.hp) facts.push(`${UNIT_TYPES[u.type].name}: ${u.hp} to ${after?.hp ?? 0} HP.`);
    }
    if (facts.length) {
      clearTimeout(timer.current);
      el.textContent = facts.join(' ');
      timer.current = setTimeout(() => { el.textContent = ''; }, 3000);
    }
  }, [state, viewer]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <output className="action-feedback" ref={output} aria-live="polite"/>;
}

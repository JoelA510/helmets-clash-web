import { UNIT_TYPES } from './constants';
import { hexKey } from './hex';
import type { City, FactionId, GameState, Impact, RecapEntry, Unit } from './types';

export const RECAP_LIMIT = 8;

// Resolvers own this state. Copy a recipient faction before appending so
// undo snapshots and previous React renders keep their original recap.
export function recordImpact(s: GameState, actor: FactionId, target: Unit | City,
  kind: Impact['kind'], amount: number, destroyed = false) {
  if (amount <= 0) return;
  const {q,r,faction} = target;
  const subject = 'type' in target ? UNIT_TYPES[target.type].name : target.name;
  const entry: RecapEntry = {q,r,kind,subject,amount,destroyed};
  const visibleTo = Object.values(s.factions).filter(f => f.id === faction || f.explored.has(hexKey(q,r))).map(f => f.id);
  s.impacts = [...(s.impacts ?? []), {...entry,visibleTo}];
  if ((kind === 'hit' || kind === 'counter') && actor !== faction) {
    const owner = s.factions[faction];
    const entries = [...(owner.recap ?? []),entry];
    s.factions[faction] = {...owner, recap:entries.slice(-RECAP_LIMIT),
      earlierHits:(owner.earlierHits ?? 0) + Number(entries.length > RECAP_LIMIT)};
  }
}

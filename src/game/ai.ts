import { recruitmentPool, recruitPreview } from './inspection';
import type { AttackTarget, Card, CardId, FactionId, FactionState, GameState, Hex, Unit } from './types';
import { TERRAIN, UNIT_TYPES } from './constants';
import { hexDistance, hexKey, neighbors, parseKey } from './hex';
import { combatForecast, computeAttackTargets, computeMoveRange, movementLeft } from './logic';
import {
  performBuild, performMove, performPlayerAttack, performRecruit, performPlayTargetedCard, performPlayUntargetedCard,
} from './actions';

function visibleTargets(s: GameState, id: FactionId) {
  const known = s.factions[id].explored;
  return [...s.units, ...s.cities].filter(t => t.faction !== id && known.has(hexKey(t.q,t.r)));
}

type AICardPlay =
  | { kind: 'untargeted'; card: Card }
  | { kind: 'targeted'; card: Card; q: number; r: number };

// Will the AI likely attack this turn? True when some friendly unit has an
// enemy within its move+range reach. Gates the pre-combat buffs (Rally,
// Ambush) so the AI doesn't burn them on a quiet turn.
const aiWillEngage = (ns: GameState, factionId: FactionId): boolean => {
  const enemies = visibleTargets(ns, factionId);
  if (!enemies.length) return false;
  return ns.units.some((u) => {
    if (u.faction !== factionId) return false;
    const reach = UNIT_TYPES[u.type].mov + UNIT_TYPES[u.type].range;
    return enemies.some((t) => hexDistance(u, t) <= reach);
  });
};

const cardInHand = (f: FactionState, id: CardId): Card | undefined =>
  f.hand.find((c) => c.id === id);

// Pick the single best card play for this faction given current state, or
// null when nothing is worth playing. Re-evaluated each loop iteration so the
// AI reacts to its own previous plays (e.g. Muster drawing into a Harvest).
// Priority order, highest first; every branch requires the card be affordable
// and in hand, and targeted picks pre-validate the target so the resolver
// never has to reject them.
const chooseAICardPlay = (ns: GameState, factionId: FactionId): AICardPlay | null => {
  const f = ns.factions[factionId];
  if (!f) return null;
  const affordable = (c: Card | undefined): c is Card => !!c && f.orders >= c.cost;
  const explored = (q: number, r: number): boolean => f.explored.has(hexKey(q, r));

  // 1. Harvest — free gold, always worth it.
  const harvest = cardInHand(f, 'harvest');
  if (affordable(harvest)) return { kind: 'untargeted', card: harvest };

  // 2/3. Pre-combat buffs — only when we expect to fight this turn.
  if (aiWillEngage(ns, factionId)) {
    const ambush = cardInHand(f, 'ambush');
    if (affordable(ambush)) return { kind: 'untargeted', card: ambush };
    const rally = cardInHand(f, 'rally');
    if (affordable(rally)) return { kind: 'untargeted', card: rally };
  }

  // 4. Siege — biggest prize: chip an explored enemy city, weakest first.
  const siege = cardInHand(f, 'siege');
  if (affordable(siege)) {
    const target = ns.cities
      .filter((c) => c.faction !== factionId && explored(c.q, c.r))
      .sort((a, b) => a.hp - b.hp)[0];
    if (target) return { kind: 'targeted', card: siege, q: target.q, r: target.r };
  }

  // 5. Curse — damage an explored enemy unit, weakest first (prefers a kill).
  const hex = cardInHand(f, 'hex');
  if (affordable(hex)) {
    const target = ns.units
      .filter((u) => u.faction !== factionId && explored(u.q, u.r))
      .sort((a, b) => a.hp - b.hp)[0];
    if (target) return { kind: 'targeted', card: hex, q: target.q, r: target.r };
  }

  // 6. Heal — mend the most-wounded ally that's missing a meaningful chunk.
  const heal = cardInHand(f, 'heal');
  if (affordable(heal)) {
    const target = ns.units
      .filter((u) => u.faction === factionId && u.maxHp - u.hp >= 4)
      .sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp))[0];
    if (target) return { kind: 'targeted', card: heal, q: target.q, r: target.r };
  }

  // Sabotage a visible rival without inspecting its private economy.
  const sabotage = cardInHand(f, 'sabotage');
  if (affordable(sabotage)) {
    const target = ns.units
      .filter(u => u.faction !== factionId && explored(u.q,u.r))
      .sort((a, b) => a.id - b.id)[0];
    if (target) return { kind: 'targeted', card: sabotage, q: target.q, r: target.r };
  }

  // 8. Feast — economy.
  const feast = cardInHand(f, 'feast');
  if (affordable(feast)) return { kind: 'untargeted', card: feast };

  // 9. Muster — refill a thin hand when there are cards left to draw.
  const muster = cardInHand(f, 'muster');
  if (affordable(muster) && f.hand.length <= 3 && (f.deck.length + f.discard.length) > 0) {
    return { kind: 'untargeted', card: muster };
  }

  const march = cardInHand(f, 'march');
  if (affordable(march)) {
    const targets = visibleTargets(ns, factionId);
    const runner = ns.units.find(u => u.faction === factionId && !u.acted && !u.movBuff &&
      !UNIT_TYPES[u.type].stationaryFire && targets.some(t => {
        const gap = hexDistance(u,t) - UNIT_TYPES[u.type].range - movementLeft(u);
        return gap > 0 && gap <= 2;
      }));
    if (runner) return {kind:'targeted',card:march,q:runner.q,r:runner.r};
  }
  const scout = cardInHand(f, 'scout');
  if (affordable(scout)) {
    let best: Hex | undefined;
    let bestGain = 0;
    // Prefer a frontier within reach of our forces, using only the board outline.
    for (const unit of ns.units.filter(u => u.faction === factionId)) {
      for (const edge of neighbors(unit.q,unit.r)) for (const tile of neighbors(edge.q,edge.r)) {
        if (!ns.map[hexKey(tile.q,tile.r)]) continue;
        const gain = neighbors(tile.q,tile.r).filter(h => ns.map[hexKey(h.q,h.r)] && !explored(h.q,h.r)).length;
        if (gain > bestGain) { best = tile; bestGain = gain; }
      }
    }
    if (best) return {kind:'targeted',card:scout,q:best.q,r:best.r};
  }
  return null;
};

// Spend the AI's orders on cards via the shared resolvers. Mutates `ns` in
// place to match runAITurnFor's contract: the resolvers return a fresh state,
// which we copy back onto the live object with Object.assign. The safety cap
// is a backstop — orders (3-4/turn) bound the real iteration count.
export const runAICardPhase = (ns: GameState, factionId: FactionId): void => {
  let safety = 16;
  while (safety-- > 0) {
    if (ns.status === 'ended') break;
    const f = ns.factions[factionId];
    // NOTE: do not break on `orders <= 0` — cost-0 cards (Harvest) are playable
    // with zero orders, matching human play. `chooseAICardPlay` only returns
    // affordable plays, so it yields null once nothing is affordable, which
    // terminates the loop (and the safety cap backstops it regardless).
    if (!f || f.hand.length === 0) break;
    const play = chooseAICardPlay(ns, factionId);
    if (!play) break;
    if (play.kind === 'untargeted') {
      const after = performPlayUntargetedCard(ns, factionId, play.card);
      if (after === ns) break; // resolver rejected — stop (defensive; shouldn't happen)
      Object.assign(ns, after);
    } else {
      const { state: after, valid } = performPlayTargetedCard(ns, factionId, play.card, play.q, play.r);
      if (!valid) break; // defensive: targets are pre-validated above
      Object.assign(ns, after);
    }
  }
};

// Distances across revealed, passable terrain. Ignoring occupants here lets
// armies approach a congested front; actual destinations use the legal range.
function distances(board: GameState, goals: Hex[]) {
  const result = new Map<string, number>();
  const queue = [...goals];
  for (const h of goals) result.set(hexKey(h.q,h.r),0);
  for (let i = 0; i < queue.length; i++) {
    const h = queue[i], distance = result.get(hexKey(h.q,h.r))!;
    for (const n of neighbors(h.q,h.r)) {
      const key = hexKey(n.q,n.r), tile = board.map[key];
      if (result.has(key) || !tile || !TERRAIN[tile.type].passable) continue;
      result.set(key,distance + 1);
      queue.push(n);
    }
  }
  return result;
}

// Explored tiles only grow during this AI turn. Share navigation work across
// units while goals and explored terrain stay the same. Occupants and combat
// options are always read from the current position.
class TurnNavigation {
  private exploredCount = -1;
  private map: GameState['map'] = {};
  private fields = new Map<string, Map<string, number>>();

  board(s: GameState, id: FactionId): GameState {
    const explored = s.factions[id].explored;
    if (explored.size !== this.exploredCount) {
      this.exploredCount = explored.size;
      this.map = {};
      for (const k of explored) if (s.map[k]) this.map[k] = s.map[k];
      this.fields.clear();
    }
    const visible = (h: Unit | GameState['cities'][number]) => h.faction === id || explored.has(hexKey(h.q, h.r));
    return { ...s, map: this.map, units: s.units.filter(visible), cities: s.cities.filter(visible) };
  }

  toward(board: GameState, goals: Hex[]) {
    const key = goals.map(h => hexKey(h.q, h.r)).join('|');
    const cached = this.fields.get(key);
    if (cached) return cached;
    const result = distances(board, goals);
    this.fields.set(key, result);
    return result;
  }

  frontier(board: GameState, outline: GameState['map']) {
    const cached = this.fields.get('frontier');
    if (cached) return cached;
    const edge = Object.values(board.map).filter(tile => TERRAIN[tile.type].passable &&
      neighbors(tile.q, tile.r).some(n => outline[hexKey(n.q, n.r)] && !board.map[hexKey(n.q, n.r)]));
    const result = distances(board, edge);
    this.fields.set('frontier', result);
    return result;
  }
}

function bestAttack(board: GameState, unit: Unit) {
  const home = board.cities.find(c => c.faction === unit.faction);
  let target: AttackTarget | undefined;
  let score = 0;
  const occupied = new Set<string>();
  for (const candidate of computeAttackTargets(unit,board)) {
    const defender = candidate.target, key = hexKey(defender.q,defender.r);
    if (occupied.has(key)) continue; // Unit precedes its city.
    occupied.add(key);
    const {damage,counter,attacker} = combatForecast(board,unit,candidate);
    const priority = Math.min(defender.hp,damage) - counter + (attacker.hp <= 0 ? -6 : 0)
      + (defender.hp <= damage ? 10 : 0) + (candidate.type === 'city' ? 8 : 0)
      + (home && hexDistance(home,defender) <= 2 ? 4 : 0);
    if (priority > score) { target = candidate; score = priority; }
  }
  return {target,score};
}

function actWithUnit(s: GameState, unit: Unit, navigation: TurnNavigation) {
  const id = unit.faction, board = navigation.board(s, id);
  const home = board.cities.find(c => c.faction === id);
  const threats = board.units.filter(u => u.faction !== id && home && hexDistance(home,u) <= 2);
  const goals: Hex[] = threats.length ? threats : board.cities.filter(c => c.faction !== id);
  if (!goals.length) goals.push(...board.units.filter(u => u.faction !== id));
  const origin = hexKey(unit.q,unit.r);
  let distance = navigation.toward(board, goals);
  const exploring = !distance.has(origin);
  if (exploring) distance = navigation.frontier(board, s.map);

  const range = computeMoveRange(unit,board);
  let bestKey = origin, bestCost = 0, bestScore = -Infinity;
  for (const [key,cost] of [[origin,0] as const,...range]) {
    const tile = board.map[key];
    if (!tile) continue;
    const position = {...unit,q:tile.q,r:tile.r,moved:unit.moved + cost};
    // Flanking must see this piece at its proposed destination.
    const simulated = cost ? {...board, units:board.units.map(u => u.id === unit.id ? position : u)} : board;
    const attack = bestAttack(simulated,position);
    const score = attack.score * 4 - (distance.get(key) ?? 100) * 2
      + TERRAIN[tile.type].defense * .25 - cost * .02
      + (threats.length && home && key === hexKey(home.q,home.r) ? 3 : 0)
      + (exploring && cost ? .1 : 0);
    if (score > bestScore) { bestScore = score; bestKey = key; bestCost = cost; }
  }
  if (bestCost) {
    const actualCost = computeMoveRange(unit,s).get(bestKey);
    if (actualCost !== undefined) {
      const h = parseKey(bestKey);
      Object.assign(s,performMove(s,unit.id,h.q,h.r,actualCost));
      s.undoBuffer = null;
    }
  }
  const current = s.units.find(u => u.id === unit.id)!;
  const {target} = bestAttack(navigation.board(s, id),current);
  if (target) Object.assign(s,performPlayerAttack(s,unit.id,target));
}

export function runAITurnFor(s: GameState, id: FactionId): void {
  if (!s.factions[id]) return;
  runAICardPhase(s,id);
  const navigation = new TurnNavigation();
  const army = s.units.filter(u => u.faction === id && !u.acted);
  for (const original of army) {
    if (s.status === 'ended') return;
    const unit = s.units.find(u => u.id === original.id);
    if (unit) actWithUnit(s, unit, navigation);
  }
  if (s.status === 'ended') return;
  const home = s.cities.find(c => c.faction === id);
  if (!home) return;
  const enemies = visibleTargets(s,id);
  const defending = enemies.some(t => hexDistance(t,home) <= 2);
  const priority = [defending ? 'walls' : 'market','barracks','market','granary','walls','walls2',
    'market2','granary2','barracks2','temple'] as const;
  for (const building of priority) {
    const next = performBuild(s,id,building);
    if (next !== s) { Object.assign(s,next); break; }
  }

  const f = s.factions[id], allies = s.units.filter(u => u.faction === id);
  const siegeTarget = s.cities.some(c => c.faction !== id && f.explored.has(hexKey(c.q,c.r)));
  const choices = recruitmentPool(f).filter(t => {
    const p = recruitPreview(s,f,t);
    return p.spawn && p.affordable && !p.requires;
  });
  function recruitmentScore(type: Unit['type']) {
    const def = UNIT_TYPES[type], count = allies.filter(u => u.type === type).length;
    if (def.stationaryFire) return siegeTarget && allies.length >= 2 && !defending && !count ? 12 : -100;
    const needsRange = allies.filter(u => UNIT_TYPES[u.type].range === 1).length > allies.length / 2;
    return (needsRange && def.range > 1 ? 5 : 0) + (defending ? def.hp / 4 : def.mov + def.atk / 4) - count * 2;
  }
  choices.sort((a,b) => recruitmentScore(b) - recruitmentScore(a));
  if (choices.length && recruitmentScore(choices[0]) > -100) Object.assign(s,performRecruit(s,id,choices[0]));
}

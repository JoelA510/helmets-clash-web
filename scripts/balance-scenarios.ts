// Controlled local fixtures. Production rules resolve every move, strike and counter.
import { performMove, performPlayerAttack, performRecruit } from '../src/game/actions';
import { runAIUnitPhase } from '../src/game/ai';
import { UNIT_TYPES } from '../src/game/constants';
import { hexDistance, hexKey, parseKey } from '../src/game/hex';
import { computeAttackTargets, computeMoveRange } from '../src/game/logic';
import { createOpeningPosition } from '../src/game/state';
import { applyEndOfSeatTurn, applyStartOfSeatTurn } from '../src/game/turn';
import type { FactionId, GameState, Hex, TerrainType, UnitType } from '../src/game/types';

const sides = ['f1', 'f2'] as const;
type Side = typeof sides[number];
const opponent = (id: Side) => id === 'f1' ? 'f2' : 'f1';
function arena(livingDefender = false) {
  const s = createOpeningPosition({seed:201, mapSize:'small', mapType:'highlands', seats:[
    {kind:'ai', name:'Living', factionPresetId:'aldermere'},
    {kind:'ai', name:'Defender', factionPresetId:livingDefender ? 'sunspire' : 'grimhold'},
  ]});
  s.units = [];
  s.map = {};
  for (let q = 0; q <= 8; q++) for (let r = -1; r <= 1; r++) {
    s.map[hexKey(q,r)] = {q,r,type:'grass'};
  }
  for (const id of sides) s.factions[id].explored = new Set(Object.keys(s.map));
  Object.assign(s.cities[0], {q:0,r:0});
  Object.assign(s.cities[1], {q:8,r:0});
  return s;
}

// Buy from a shared purse, then place each purchased piece in formation.
function deploy(s: GameState, faction: FactionId, type: UnitType, q: number, r = 0) {
  const next = performRecruit(s,faction,type);
  if (next === s) throw new Error(`Cannot afford or place ${type}`);
  Object.assign(s,next);
  const unit = s.units.at(-1)!;
  Object.assign(unit, {q,r});
  return unit.id;
}

function begin(s: GameState, id: FactionId) {
  s.activeSeatIdx = s.seats.find(seat => seat.factionId === id)!.idx;
  applyStartOfSeatTurn(s,id);
}

function survivors(s: GameState) {
  return s.units.map(({faction,type,hp}) => ({faction,type,hp}));
}

export function screens(first: Side, terrain: TerrainType, reverse: boolean) {
  const s = arena();
  const x = (q: number) => reverse ? 8-q : q;
  s.cities[0].q = x(0);
  s.cities[1].q = x(8);
  for (const id of sides) Object.assign(s.factions[id], {gold:9,food:6});
  deploy(s,'f1','knight',x(3));
  deploy(s,'f1','mage',x(2));
  deploy(s,'f2','skeleton',x(5));
  deploy(s,'f2','lich',x(6));
  let firstStrike: Side | null = null;
  for (const q of [3,5]) s.map[hexKey(q,0)].type = terrain;
  for (let round = 1; round <= 20; round++) {
    s.turn = round;
    for (const id of [first,opponent(first)] as const) {
      begin(s,id);
      const priorLog = s.log.at(-1);
      runAIUnitPhase(s,id);
      // Only strikes produce log entries in the isolated unit phase.
      if (s.log.at(-1) !== priorLog) firstStrike ??= id;
      for (const side of sides) {
        if (!s.units.some(u => u.faction === side) || !s.cities.some(c => c.faction === side)) {
          return {winner:opponent(side), firstStrike, round, survivors:survivors(s)};
        }
      }
    }
  }
  return {winner:null, round:20, firstStrike, survivors:survivors(s)};
}

function move(s: GameState, unitId: number, destination: Hex) {
  const u = s.units.find(u => u.id === unitId)!;
  const cost = computeMoveRange(u,s).get(hexKey(destination.q,destination.r));
  if (cost === undefined) throw new Error(`Unreachable destination for ${u.type}`);
  Object.assign(s,performMove(s,unitId,destination.q,destination.r,cost));
}

// Follow the deployed game's unit-before-city targeting order.
function strike(s: GameState, unitId: number, at: Hex) {
  const u = s.units.find(u => u.id === unitId);
  if (!u || u.acted) return false;
  const target = computeAttackTargets(u,s).find(t => t.target.q === at.q && t.target.r === at.r);
  if (!target) return false;
  const next = performPlayerAttack(s,unitId,target);
  if (next === s) throw new Error('Legal strike was rejected');
  Object.assign(s,next);
  return true;
}

export function raiderRace(first: Side) {
  const s = arena();
  // Parallel approaches keep the runners from duelling each other. Each is
  // seven hexes from its target. Equal travel distance and ordinary city regen.
  Object.assign(s.cities[0], {q:0,r:1});
  Object.assign(s.cities[1], {q:8,r:-1});
  const units = {f1:deploy(s,'f1','rogue',1,-1), f2:deploy(s,'f2','wraith',7,1)};
  const firstHit: Partial<Record<FactionId,number>> = {};
  for (let round = 1; round <= 20; round++) {
    s.turn = round;
    for (const id of [first,opponent(first)] as const) {
      begin(s,id);
      const u = s.units.find(u => u.id === units[id])!;
      const target = s.cities.find(c => c.faction !== id)!;
      if (hexDistance(u,target) > UNIT_TYPES[u.type].range) {
        const path = [...computeMoveRange(u,s).keys()].map(parseKey)
          .filter(h => h.r === u.r).sort((a,b) => hexDistance(a,target) - hexDistance(b,target));
        if (path.length && hexDistance(path[0],target) < hexDistance(u,target)) move(s,u.id,path[0]);
      }
      if (strike(s,u.id,target)) firstHit[id] ??= round;
      if (s.winner) return {winner:s.winner, round, firstHit, survivors:survivors(s)};
      applyEndOfSeatTurn(s,id);
    }
  }
  return {winner:null, round:20, firstHit, survivors:survivors(s)};
}

export function siege(response: 'none' | 'garrison' | 'sortie' | 'combined') {
  const s = arena(true);
  s.factions.f1.buildings.add('barracks');
  Object.assign(s.factions.f1, {gold:6,food:3});
  Object.assign(s.factions.f2, {gold:7,food:4});
  const engine = deploy(s,'f1','ballista',5);
  const city = s.cities[1];
  const guard = response === 'none' ? null : deploy(s,'f2','knight',response === 'garrison' ? 8 : 7);
  const archer = response === 'combined' ? deploy(s,'f2','archer',7,-1) : null;
  begin(s,'f1');
  const emplacement = {q:6,r:0};
  move(s,engine,emplacement);
  const firedAfterMoving = strike(s,engine,city);
  begin(s,'f2');
  if (guard && response !== 'garrison') strike(s,guard,emplacement);
  if (archer) strike(s,archer,emplacement);
  s.turn++;
  begin(s,'f1');
  const firedNextTurn = strike(s,engine,city);
  return {response, firedAfterMoving, firedNextTurn, cityHP:s.cities[1].hp, survivors:survivors(s)};
}

import { expect, it } from 'vitest';
import { initialState } from '../game/state';
import { computeMoveRange } from '../game/logic';
import { CARD_POOL } from '../game/constants';
import { runAICardPhase, runAITurnFor } from '../game/ai';
import { mkConfig } from './helpers';

function field() {
  const s = initialState(mkConfig());
  s.map = {};
  for (let q = -6; q <= 6; q++) for (let r = -1; r <= 1; r++)
    s.map[[q,r].join(',')] = {q,r,type:'grass'};
  const a = s.units.find(u => u.faction === 'f1')!;
  const d = s.units.find(u => u.faction === 'f2')!;
  Object.assign(a,{q:0,r:0}); Object.assign(d,{q:1,r:0});
  s.units = [a,d];
  Object.assign(s.cities[0],{q:-1,r:0}); Object.assign(s.cities[1],{q:6,r:0});
  const f = s.factions.f1;
  Object.assign(f,{hand:[],gold:0,food:0,explored:new Set(Object.keys(s.map))});
  return {s,a,d,f};
}

it('pays for purchases after a kill and retains the building in the live faction', () => {
  const {s,d,f} = field();
  d.hp = 1; f.gold = f.food = 20;
  runAITurnFor(s,'f1');
  expect(s.factions.f1.totalKills).toBe(1);
  expect(s.factions.f1.buildings.size).toBe(1);
  expect(s.units.filter(u => u.faction === 'f1')).toHaveLength(2);
  expect(s.factions.f1.gold).toBeLessThan(20);
});

it('gives AI Bastions the same +15 maximum HP as human Bastions', () => {
  const {s,f} = field();
  s.units = [];
  f.buildings = new Set(['granary','granary2','market','market2','walls','barracks','barracks2','temple','watchtower','tavern','war_council']);
  f.gold = 6; f.food = 5;
  s.cities[0].hp = s.cities[0].maxHp = 35;
  runAITurnFor(s,'f1');
  expect(s.cities[0].maxHp).toBe(50);
});

it('clears the garrison before ordinary attacks on a capital', () => {
  const {s,d} = field();
  s.cities[1].q = d.q;
  runAITurnFor(s,'f1');
  expect(s.units.find(u => u.id === d.id)!.hp).toBeLessThan(9);
  expect(s.cities[1].hp).toBe(20);
});

it('explores identically with opposite undiscovered capital locations', () => {
  function scout(q: number) {
    const {s,a,f} = field(); s.units = [a]; s.cities[1].q = q;
    f.explored = new Set(['-1,0','0,0','1,0']);
    runAITurnFor(s,'f1');
    const unit = s.units.find(u => u.id === a.id)!;
    expect(s.factions.f1.explored.size).toBeGreaterThan(3);
    return [unit.q,unit.r];
  }
  expect(scout(5)).toEqual(scout(-5));
});

it('uses a legal destination when an enemy controls the direct approach', () => {
  const {s,a,d} = field();
  Object.assign(d,{q:2,r:-1}); s.cities[1].q = 3;
  s.map = Object.fromEntries(Object.entries(s.map).filter(([,t]) => t.r === 0 || (t.q === d.q && t.r === d.r)));
  const range = computeMoveRange(a,s);
  expect(range.has('2,0')).toBe(false);
  runAITurnFor(s,'f1');
  const moved = s.units.find(u => u.id === a.id)!;
  expect([moved.q,moved.r]).toEqual([1,0]);
  expect(range.has([moved.q,moved.r].join(','))).toBe(true);
});

it('spends Forced March to reach an exposed city beyond normal movement', () => {
  const {s,a,f} = field();
  s.units = [a]; s.cities[1].q = 5;
  f.hand = [{...CARD_POOL.find(c => c.id === 'march')!,uid:'march'}];
  runAITurnFor(s,'f1');
  expect(s.cities[1].hp).toBeLessThan(20);
  expect(s.units[0].movBuff).toBe(2);
});

it('uses Scout at the frontier and chooses Sabotage without reading the victim treasury', () => {
  const {s,f,d} = field();
  const card = (id:'sabotage'|'scout') => ({...CARD_POOL.find(c => c.id === id)!,uid:id});
  f.hand = [card('scout'),card('sabotage')];
  f.explored = new Set(['0,0',[d.q,d.r].join(',')]);
  s.factions.f2.gold = s.factions.f2.food = 0;
  runAICardPhase(s,'f1');
  expect(s.factions.f1.hand).toEqual([]);
  expect(s.factions.f1.explored.size).toBeGreaterThan(2);
});

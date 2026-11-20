import { expect, it } from 'vitest';
import { initialState } from '../game/state';
import { performBuild, performMove, performPlayerAttack, performRecruit } from '../game/actions';
import { computeAttackTargets, combatForecast, movementLeft } from '../game/logic';
import { mkConfig } from './helpers';

it('unlocks Ballistas for either army through Barracks without changing starters', () => {
  let state = initialState(mkConfig());
  for (const id of ['f1','f2'] as const) {
    expect(state.units.filter(u => u.faction === id).map(u => u.type)).toEqual(id === 'f1' ? ['knight','rogue'] : ['skeleton','skeleton']);
    state.factions[id].gold = state.factions[id].food = 20;
    expect(performRecruit(state,id,'ballista')).toBe(state);
    expect(performRecruit(state,id,id === 'f1' ? 'lich' : 'knight')).toBe(state);
    state = performRecruit(performBuild(state,id,'barracks'),id,'ballista');
    expect(state.units.at(-1)).toMatchObject({type:'ballista',faction:id,hp:9,acted:true});
  }
});

it('forecasts siege damage and requires deployment before firing', () => {
  const s = initialState(mkConfig());
  const a = s.units[0], city = s.cities[1];
  Object.assign(a,{type:'ballista',q:0,r:0,movBuff:2});
  Object.assign(city,{q:2,r:0});
  s.units = [a];
  const target = {type:'city' as const,target:city};
  expect(combatForecast(s,a,target).damage).toBe(7);
  const moved = performMove(s,a.id,1,0,1);
  expect(computeAttackTargets(moved.units[0],moved)).toEqual([]);
  expect(performPlayerAttack(moved,a.id,target)).toBe(moved);
  const shot = performPlayerAttack(s,a.id,target);
  expect(shot.cities[1].hp).toBe(13);
  expect(movementLeft(shot.units[0])).toBe(0);
  expect(performMove(shot,a.id,1,0,1)).toBe(shot);
});

it('uses the unit attack and counter rules against a screened city on either side', () => {
  const s = initialState(mkConfig());
  const [engine,,guard] = s.units, city = s.cities[1];
  Object.assign(engine,{type:'ballista',q:0,r:0,atkBuff:0});
  Object.assign(guard,{q:2,r:0});
  Object.assign(city,{q:2,r:0});
  s.map['2,0'] = {q:2,r:0,type:'grass'};
  s.units = [engine,guard];
  expect(performPlayerAttack(s,engine.id,{type:'city',target:city})).toBe(s);
  const unitShot = performPlayerAttack(s,engine.id,{type:'unit',target:guard});
  expect(unitShot.units[1].hp).toBe(guard.hp - 2);
  expect(unitShot.units[0].hp).toBe(engine.hp);
  expect(unitShot.cities[1].hp).toBe(20);
  guard.q = 1;
  expect(performPlayerAttack(s,engine.id,{type:'unit',target:guard}).units[0].hp).toBeLessThan(engine.hp);
});

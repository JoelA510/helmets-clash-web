import { expect, it } from 'vitest';
import { migrateLoadedGameState } from '../game/persist';
import { initialState } from '../game/state';
import { performPlayerAttack, performPlayTargetedCard } from '../game/actions';
import { applyEndOfSeatTurn } from '../game/turn';
import { CARD_POOL } from '../game/constants';
import { mkConfig } from './helpers';

it('records capped damage and promotion healing independently of the shared log', () => {
  const s = initialState(mkConfig()), a = s.units[0], d = s.units.find(u => u.faction === 'f2')!;
  Object.assign(a,{hp:4,kills:1}); Object.assign(d,{q:a.q+1,r:a.r,hp:1});
  const next = performPlayerAttack(s,a.id,{type:'unit',target:d});
  expect(next.impacts?.map(e => [e.kind,e.amount])).toEqual([['hit',1],['promotion',1],['heal',9]]);
  next.log = [];
  expect(next.factions.f2.recap).toMatchObject([{kind:'hit',amount:1}]);
  expect(next.factions.f1.recap ?? []).toEqual([]);
  applyEndOfSeatTurn(next,'f2');
  expect(next.factions.f2.recap).toEqual([]);
});

it('records actual Heal amount and excludes uninvolved viewers at event time', () => {
  const s = initialState(mkConfig()), u = s.units[0];
  const heal = {...CARD_POOL.find(c => c.id === 'heal')!,uid:'heal'};
  s.factions.f1.hand = [heal]; u.hp = u.maxHp - 1;
  const {state} = performPlayTargetedCard(s,'f1',heal,u.q,u.r);
  s.factions.f2.explored.add([u.q,u.r].join(','));
  expect(state.impacts).toMatchObject([{kind:'heal',amount:1,visibleTo:['f1']}]);
});

it('keeps only the last eight owned hits, across intervening seats, without serializing transient effects', () => {
  let s = initialState(mkConfig({seats:[
    {kind:'human',name:'One'}, {kind:'human',name:'Two'}, {kind:'ai',name:'Three'},
  ]}));
  const city = s.cities[1];
  s.units = s.units.filter(u => u.faction !== 'f2');
  city.hp = city.maxHp = 200;
  for (let i = 0; i < 10; i++) {
    const a = s.units.find(u => u.faction === (i%2 ? 'f1' : 'f3'))!;
    Object.assign(a,{q:city.q+1,r:city.r,acted:false});
    s = performPlayerAttack(s,a.id,{type:'city',target:city});
    applyEndOfSeatTurn(s,a.faction);
  }
  expect(s.factions.f2.recap).toHaveLength(8);
  expect(s.factions.f2.earlierHits).toBe(2);
  const raw = JSON.parse(JSON.stringify(s,(_,v) => v instanceof Set ? [...v] : v));
  raw.impacts = ['bad'];
  raw.factions.f2.recap.push({subject:{},kind:'hit'});
  const loaded = migrateLoadedGameState(raw)!;
  expect(loaded.factions.f2.recap).toEqual(s.factions.f2.recap);
  expect(loaded.impacts).toBeUndefined();
});

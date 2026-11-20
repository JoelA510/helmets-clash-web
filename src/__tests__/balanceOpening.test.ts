import { play, swapMirrorSpawns } from '../../scripts/balance-pairs';
import { expect, it } from 'vitest';
import { createOpeningPosition, initialState } from '../game/state';
import { applyStartOfSeatTurn } from '../game/turn';
import { mkConfig } from './helpers';

it('can start either seat on the same deal, including a noncontiguous setup', () => {
  const config = mkConfig({ seats: [
    { kind: 'empty', name: '' }, { kind: 'ai', name: 'A' }, { kind: 'ai', name: 'B' },
  ] });
  const dealt = createOpeningPosition(config);
  const reversed = structuredClone(dealt);
  expect(dealt.factions.f1.hand).toHaveLength(4);
  reversed.activeSeatIdx = reversed.seats[1].idx;
  applyStartOfSeatTurn(reversed, 'f2');
  expect(reversed.factions.f2.hand).toHaveLength(5);
  expect(reversed.factions.f1.hand).toEqual(dealt.factions.f1.hand);
  applyStartOfSeatTurn(dealt,'f1');
  expect(dealt).toEqual(initialState(config));
});

it('crosses physical openings while keeping seat deals and unit order stable, including unequal deployments', () => {
  const s = createOpeningPosition(mkConfig({seats:[
    {kind:'ai', name:'A', factionPresetId:'aldermere'}, {kind:'ai', name:'B', factionPresetId:'sunspire'},
  ]}));
  s.units.pop();
  const original = structuredClone(s);
  swapMirrorSpawns(s);
  expect(s.cities[0]).toMatchObject({faction:'f1', q:original.cities[1].q, r:original.cities[1].r});
  expect(s.factions.f1.explored).toEqual(original.factions.f2.explored);
  expect(s.factions.f1.deck).toEqual(original.factions.f1.deck);
  expect(s.units.filter(u => u.faction === 'f1')).toHaveLength(1);
  swapMirrorSpawns(s);
  expect(s).toEqual(original);
});

it('preserves a shared opening across runs and records capped games as timeouts', () => {
  const s = createOpeningPosition(mkConfig());
  const original = structuredClone(s);
  for (const first of ['f1','f2'] as const) {
    expect(play(s,first,1)).toMatchObject({winner:null, round:1});
    expect(s).toEqual(original);
  }
});

it('the chosen opener can finish the campaign before the other seat draws or acts', () => {
  const s = createOpeningPosition(mkConfig());
  s.map = {};
  for (let q = 0; q < 4; q++) s.map[q+',0'] = {q,r:0,type:'grass'};
  for (const [i, seat] of s.seats.entries()) {
    const f = s.factions[seat.factionId];
    Object.assign(f, {hand:[],deck:[],discard:[],explored:new Set(Object.keys(s.map))});
    Object.assign(s.cities[i], {q:i*3,r:0,hp:1});
  }
  s.units = s.seats.map((seat,i) => ({
    ...s.units.find(u => u.faction === seat.factionId)!, q:2-i,r:0,
  }));
  for (const first of ['f1','f2'] as const) {
    expect(play(s,first,1)).toEqual({winner:first,round:1,firstCapitalHit:{[first]:1},firstInRange:{[first]:1}});
  }
});

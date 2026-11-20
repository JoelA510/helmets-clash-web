import { describe, expect, it } from 'vitest';
import { CARD_POOL, UNIT_TYPES } from '../game/constants';
import { initialState } from '../game/state';
import { combatForecast, movementLeft, readyUnits } from '../game/logic';
import { cardDestination, recruitPreview } from '../game/inspection';
import { nextDraw, nextOrders, turnIncome, applyEndOfSeatTurn } from '../game/turn';
import { performPlayerAttack, performRecruit, performPlayTargetedCard, performPlayUntargetedCard } from '../game/actions';
import type { CardId } from '../game/types';
import { mkConfig, cloneState } from './helpers';

const setup = () => {
  const state = initialState(mkConfig());
  const [a, ally, d] = state.units;
  Object.assign(a, { q: 0, r: 0, level: 1, atkBuff: 2, kills: 3, hp: 4 });
  Object.assign(ally, { q: 1, r: -1 });
  Object.assign(d, { q: 1, r: 0, level: 1, atkBuff: 2, acted: false, hp: 20, maxHp: 20 });
  state.units = [a, ally, d];
  state.map['1,0'] = {q:1,r:0,type:'forest'};
  state.map['0,0'] = {q:0,r:0,type:'hills'};
  state.factions.f1.ambushActive = true;
  return { state, a, d, faction: state.factions.f1 };
};

const cardOf = (id: CardId) => ({ ...CARD_POOL.find(c => c.id === id)!, uid: id });

describe('inspection uses the committed rules', () => {
  it.each(['trade', 'kill', 'counter kill', 'out of counter range', 'city'] as const)('%s predicts survivor HP without mutating state or RNG', kind => {
    const { state, a, d } = setup();
    if (kind === 'kill') d.hp = 1;
    if (kind === 'counter kill') { a.hp = 1; d.kills = 3; }
    if (kind === 'out of counter range') { a.type = 'archer'; a.q = -1; }
    const city = state.cities[1];
    city.hp = 1;
    const target = kind === 'city' ? { type: 'city' as const, target: city } : { type: 'unit' as const, target: d };
    const before = cloneState(state);
    const forecast = combatForecast(state, a, target);
    expect(state).toEqual(before);
    const next = performPlayerAttack(state, a.id, target);
    expect(Math.max(0,forecast.attacker.hp)).toBe(next.units.find(u => u.id === a.id)?.hp ?? 0);
    const defenders = kind === 'city' ? next.cities : next.units;
    expect(Math.max(0,forecast.defender.hp)).toBe(defenders.find(u => u.id === target.target.id)?.hp ?? 0);
    if (kind === 'trade') {
      expect(forecast.modifiers).toEqual({ flankBonus:1, ambushBonus:3, defense:2, counterDefense:1 });
      expect(forecast.damage).toBe(10);
      expect(forecast.counter).toBeGreaterThan(0);
    } else if (kind === 'counter kill') expect(forecast.defender.hp).toBe(d.maxHp + 1);
    else {
      expect(forecast.counter).toBe(0);
      if (kind !== 'out of counter range') expect(forecast.attacker.hp).toBe(a.maxHp + 1);
    }
  });

  it('previews both barracks tiers, balances, and refuses a completely blocked deployment', () => {
    const {state, faction} = setup();
    faction.buildings = new Set(['barracks','barracks2']);
    const preview = recruitPreview(state,faction,'mage');
    expect(preview.hp).toBe(UNIT_TYPES.mage.hp + 4);
    const next = performRecruit(state,'f1','mage');
    const recruit = next.units.at(-1)!;
    expect(recruit).toMatchObject({ hp:preview.hp, maxHp:preview.hp, q:preview.spawn!.q, r:preview.spawn!.r });
    expect(next.factions.f1).toMatchObject({ gold:preview.gold, food:preview.food });
    expect(readyUnits(next,'f1')).not.toContain(recruit);
    for (const tile of Object.values(state.map)) tile.type = 'water';
    expect(recruitPreview(state,faction,'mage').spawn).toBeUndefined();
    expect(performRecruit(state,'f1','mage')).toBe(state);
  });

  it('readiness includes partial movement, attacks after movement and new movement after Forced March', () => {
    const {state,a,d,faction} = setup();
    state.units = [a,d]; state.cities = [];
    state.map = {'0,0':{q:0,r:0,type:'grass'},'1,0':{q:1,r:0,type:'grass'}};
    a.moved = 1;
    expect(readyUnits(state,'f1')).toEqual([a]); // Blocked by defender, still has an attack.
    a.acted = true;
    expect(readyUnits(state,'f1')).toEqual([]);
    d.q = 6;
    expect(readyUnits(state,'f1')).toEqual([a]);
    a.moved = UNIT_TYPES[a.type].mov;
    expect(readyUnits(state,'f1')).toEqual([]);
    const card = cardOf('march'); faction.hand = [card];
    const next = performPlayTargetedCard(state,'f1',card,0,0).state;
    expect(readyUnits(next,'f1').map(u => u.id)).toEqual([a.id]);
    expect(movementLeft(next.units[0])).toBe(2);
  });

  it.each(['march','heal','hex','sabotage','siege','scout'] as const)('%s highlights exactly the accepted destinations', id => {
    const {state,faction,a,d} = setup();
    const card = cardOf(id); faction.hand = [card];
    state.cities[1].q = d.q; state.cities[1].r = d.r;
    faction.explored = new Set(['0,0']);
    for (const explored of [false,true]) {
      if (explored) faction.explored.add('1,0');
      for (const [q,r] of [[0,0],[1,0],[99,99]]) {
        const expected = q === 0 ? ['march','heal','scout'].includes(id) :
          q === 1 && (id === 'scout' || (explored && ['hex','sabotage','siege'].includes(id)));
        a.hp = a.maxHp;
        expect(!!cardDestination(state,'f1',card,q,r)).toBe(expected);
        const play = performPlayTargetedCard(state,'f1',card,q,r);
        expect(play.valid).toBe(expected);
        if (!expected) expect(play.state).toBe(state);
        if (play.valid && id === 'heal') expect(play.state.units[0].hp).toBe(a.maxHp);
      }
    }
  });

  it('previews capped healing, pool-limited draws and free Harvest at zero Orders', () => {
    const {state,faction,a} = setup();
    faction.orders = 0;
    faction.hand = [cardOf('harvest')];
    expect(performPlayUntargetedCard(state,'f1',faction.hand[0]).factions.f1.gold).toBe(faction.gold+6);
    faction.buildings = new Set(['walls','walls2','temple','war_council','tavern']);
    const city = state.cities[0]; city.hp -= 3; a.q = city.q; a.r = city.r; a.hp = a.maxHp - 1;
    const preview = turnIncome(state,faction);
    const copy = cloneState(state); applyEndOfSeatTurn(copy,'f1');
    expect(preview.cityHealing).toBe(3); expect(preview.unitHealing.get(a.id)).toBe(1);
    expect(copy.factions.f1.gold - faction.gold).toBe(preview.goldGain);
    expect(copy.factions.f1.food - faction.food).toBe(preview.foodGain);
    expect(nextOrders(faction)).toBe(4);
    faction.hand = Array(7).fill(cardOf('heal')); expect(nextDraw(faction)).toBe(0);
    faction.hand = []; faction.deck = []; faction.discard = [cardOf('march')]; expect(nextDraw(faction)).toBe(1);
  });
});

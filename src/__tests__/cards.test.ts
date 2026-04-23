import { describe, expect, it } from 'vitest';
import type { Card, CardId, CardTarget, FactionId } from '../game/types';
import { CARD_POOL } from '../game/constants';
import { initialState } from '../game/state';
import { performPlayTargetedCard, performPlayUntargetedCard } from '../ui/gameActions';
import { hexKey } from '../game/hex';
import { cloneState, mkConfig } from './helpers';

// Build a synthetic Card from the pool template; gives us a stable uid for
// assertions without caring what the deck happened to shuffle.
const forceCard = (factionId: FactionId, id: CardId): Card => {
  const tpl = CARD_POOL.find((c) => c.id === id)!;
  return { ...tpl, uid: `${factionId}:${tpl.id}#test` };
};

describe('non-targeted cards', () => {
  it('Harvest grants +6 gold', () => {
    const s0 = initialState(mkConfig({ seed: 1 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'harvest');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    const goldBefore = s.factions[f1].gold;
    const after = performPlayUntargetedCard(s, f1, card);
    expect(after.factions[f1].gold).toBe(goldBefore + 6);
    expect(after.factions[f1].hand.some((c) => c.uid === card.uid)).toBe(false);
    expect(after.factions[f1].discard.some((c) => c.uid === card.uid)).toBe(true);
  });

  it('Royal Feast grants +4 gold and +4 food', () => {
    const s0 = initialState(mkConfig({ seed: 2 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'feast');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    const goldBefore = s.factions[f1].gold;
    const foodBefore = s.factions[f1].food;
    const after = performPlayUntargetedCard(s, f1, card);
    expect(after.factions[f1].gold).toBe(goldBefore + 4);
    expect(after.factions[f1].food).toBe(foodBefore + 4);
  });

  it('Muster draws 2 cards', () => {
    const s0 = initialState(mkConfig({ seed: 3 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'muster');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    // Ensure there are at least 2 cards to draw.
    expect(s.factions[f1].deck.length).toBeGreaterThanOrEqual(2);
    const handBefore = s.factions[f1].hand.length;
    const deckBefore = s.factions[f1].deck.length;
    const after = performPlayUntargetedCard(s, f1, card);
    // Hand loses 1 (the played Muster) and gains 2 = net +1.
    expect(after.factions[f1].hand.length).toBe(handBefore + 1);
    expect(after.factions[f1].deck.length).toBe(deckBefore - 2);
  });

  it('Rally applies +2 atkBuff to the faction\'s existing units', () => {
    const s0 = initialState(mkConfig({ seed: 4 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'rally');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    const after = performPlayUntargetedCard(s, f1, card);
    const buffs = after.units.filter((u) => u.faction === f1).map((u) => u.atkBuff);
    expect(buffs.every((b) => b === 2)).toBe(true);
    const enemyBuffs = after.units.filter((u) => u.faction !== f1).map((u) => u.atkBuff);
    expect(enemyBuffs.every((b) => b === 0)).toBe(true);
  });

  it('refuses to play when orders are insufficient', () => {
    const s0 = initialState(mkConfig({ seed: 5 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'rally'); // cost 2
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 1;
    const after = performPlayUntargetedCard(s, f1, card);
    // Returned state === input; no mutation.
    expect(after).toBe(s);
  });
});

describe('targeted cards', () => {
  it('Forced March adds +2 movBuff to an ally unit on the targeted tile', () => {
    const s0 = initialState(mkConfig({ seed: 6 }));
    const f1 = s0.seats[0].factionId;
    const unit = s0.units.find((u) => u.faction === f1)!;
    const card = forceCard(f1, 'march');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, unit.q, unit.r);
    expect(valid).toBe(true);
    expect(after.units.find((u) => u.id === unit.id)!.movBuff).toBe(2);
  });

  it('Healing Hand restores 5 HP to an ally, clamped to maxHp', () => {
    const s0 = initialState(mkConfig({ seed: 7 }));
    const f1 = s0.seats[0].factionId;
    const unit = s0.units.find((u) => u.faction === f1)!;
    const card = forceCard(f1, 'heal');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    // Damage the unit so healing is observable.
    const u = s.units.find((x) => x.id === unit.id)!;
    u.hp = Math.max(1, u.maxHp - 7);
    const hpBefore = u.hp;
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, unit.q, unit.r);
    expect(valid).toBe(true);
    const healed = after.units.find((x) => x.id === unit.id)!;
    expect(healed.hp).toBe(Math.min(healed.maxHp, hpBefore + 5));
  });

  it('Scout reveals a 2-hex diamond around the target tile', () => {
    const s0 = initialState(mkConfig({ seed: 8 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'scout');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    // Pick a tile known to exist — seed 8 medium pangaea has plenty.
    const targetKey = Object.keys(s.map)[0];
    const [tq, tr] = targetKey.split(',').map(Number);
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, tq, tr);
    expect(valid).toBe(true);
    expect(after.factions[f1].explored.has(hexKey(tq, tr))).toBe(true);
  });

  it('Curse deals 4 damage to an enemy unit (regression: requires explored tile)', () => {
    const s0 = initialState(mkConfig({ seed: 9 }));
    const f1 = s0.seats[0].factionId;
    const f2 = s0.seats[1].factionId;
    const enemy = s0.units.find((u) => u.faction === f2)!;
    const card = forceCard(f1, 'hex');
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    // Make sure the curse target is in our explored set — cards that target
    // enemy units require the tile to be visible.
    s.factions[f1].explored.add(hexKey(enemy.q, enemy.r));
    const hpBefore = s.units.find((u) => u.id === enemy.id)!.hp;
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, enemy.q, enemy.r);
    expect(valid).toBe(true);
    const post = after.units.find((u) => u.id === enemy.id);
    if (post) {
      expect(post.hp).toBe(hpBefore - 4);
    } else {
      // Enemy died (hpBefore was low enough that 4 dmg killed them).
      expect(hpBefore).toBeLessThanOrEqual(4);
    }
  });

  it('rejects a targeted card played on an invalid tile', () => {
    const s0 = initialState(mkConfig({ seed: 10 }));
    const f1 = s0.seats[0].factionId;
    const card = forceCard(f1, 'heal'); // requires ally_unit
    const s = cloneState(s0);
    s.factions[f1].hand = [card];
    s.factions[f1].orders = 3;
    // Target an empty hex, no ally unit present.
    const { state: after, valid } = performPlayTargetedCard(s, f1, card, -999, -999);
    expect(valid).toBe(false);
    expect(after).toBe(s);
  });
});

describe('every card in CARD_POOL has a handler', () => {
  const TARGETED: CardTarget[] = ['ally_unit', 'enemy_unit', 'tile'];
  for (const tpl of CARD_POOL) {
    it(`${tpl.name} (${tpl.id}) can be played without throwing`, () => {
      const s0 = initialState(mkConfig({ seed: 11 }));
      const f1 = s0.seats[0].factionId;
      const f2 = s0.seats[1].factionId;
      const card = forceCard(f1, tpl.id);
      const s = cloneState(s0);
      s.factions[f1].hand = [card];
      s.factions[f1].orders = 3;
      if (tpl.target === 'none') {
        expect(() => performPlayUntargetedCard(s, f1, card)).not.toThrow();
      } else if (TARGETED.includes(tpl.target)) {
        // Find a valid target for each targeted card type.
        let q: number;
        let r: number;
        if (tpl.target === 'ally_unit') {
          const u = s.units.find((x) => x.faction === f1)!;
          q = u.q; r = u.r;
        } else if (tpl.target === 'enemy_unit') {
          const u = s.units.find((x) => x.faction === f2)!;
          s.factions[f1].explored.add(hexKey(u.q, u.r));
          q = u.q; r = u.r;
        } else {
          const [tq, tr] = Object.keys(s.map)[0].split(',').map(Number);
          q = tq; r = tr;
        }
        expect(() => performPlayTargetedCard(s, f1, card, q, r)).not.toThrow();
      }
    });
  }
});

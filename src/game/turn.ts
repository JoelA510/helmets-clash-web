// @ts-nocheck
import { TERRAIN } from './constants';
import { hexKey, neighbors } from './hex';
import { shuffle } from './rng';
import { revealArea } from './state';

// Run end-of-turn housekeeping for one seat: yields, city regen, log entry.
// Mutates `ns` in place and appends to ns.log.
export const applyEndOfSeatTurn = (ns, factionId) => {
  const faction = ns.factions[factionId];
  if (!faction) return;
  const city = ns.cities.find((c) => c.faction === factionId);
  let goldGain = 2, foodGain = 2;
  if (city) {
    [{ q: city.q, r: city.r }, ...neighbors(city.q, city.r)].forEach((n) => {
      const tile = ns.map[hexKey(n.q, n.r)];
      if (tile) {
        const y = TERRAIN[tile.type].yield;
        goldGain += y.gold || 0;
        foodGain += y.food || 0;
      }
    });
    if (faction.buildings.has('market')) goldGain += 2;
    if (faction.buildings.has('granary')) foodGain += 2;
    const wallsRegen = faction.buildings.has('walls') ? 2 : 0;
    city.hp = Math.min(city.maxHp, city.hp + 2 + wallsRegen);
  }
  faction.gold += goldGain;
  faction.food += foodGain;
  ns.log = [...ns.log.slice(-25), {
    turn: ns.turn, faction: factionId,
    text: `${faction.displayName}: +${goldGain} gold, +${foodGain} food.`,
  }];
};

// Start-of-turn housekeeping for one seat: reset unit flags, refresh orders,
// draw cards (humans only), reveal around units/cities.
export const applyStartOfSeatTurn = (ns, factionId) => {
  const faction = ns.factions[factionId];
  if (!faction) return;
  ns.units.forEach((u) => {
    if (u.faction === factionId) {
      u.moved = 0;
      u.acted = false;
      u.movBuff = 0;
      if (!faction.rallyActive) u.atkBuff = 0;
    }
  });
  faction.rallyActive = false;
  const ordersBonus = faction.buildings.has('war_council') ? 1 : 0;
  faction.orders = 3 + ordersBonus;

  if (faction.kind === 'human') {
    const drawCount = 1 + (faction.buildings.has('tavern') ? 1 : 0);
    const deck = [...faction.deck];
    let discard = [...faction.discard];
    const hand = [...faction.hand];
    for (let i = 0; i < drawCount; i++) {
      if (hand.length >= 7) break;
      if (!deck.length && discard.length) {
        const reshuffled = shuffle(discard);
        deck.push(...reshuffled);
        discard = [];
      }
      if (deck.length) hand.push(deck.pop());
    }
    faction.deck = deck;
    faction.discard = discard;
    faction.hand = hand;
  }

  // Reveal vision (humans only - AI doesn't need fog).
  if (faction.kind === 'human') {
    const explored = new Set(faction.explored);
    ns.units.filter((u) => u.faction === factionId).forEach((u) => revealArea(explored, u.q, u.r, 1));
    ns.cities.filter((c) => c.faction === factionId).forEach((c) => {
      const radius = faction.buildings.has('watchtower') ? 3 : 2;
      revealArea(explored, c.q, c.r, radius);
    });
    faction.explored = explored;
  }
};

// Find the next living seat after the given index, wrapping. Returns null if
// no living seats remain.
export const nextLivingSeat = (state, fromIdx) => {
  const seats = state.seats;
  if (!seats.length) return null;
  const aliveFactionIds = new Set(state.cities.map((c) => c.faction));
  for (let step = 1; step <= seats.length; step++) {
    const seat = seats[(seats.findIndex((s) => s.idx === fromIdx) + step) % seats.length];
    if (aliveFactionIds.has(seat.factionId)) return seat;
  }
  return null;
};

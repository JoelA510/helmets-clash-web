import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Castle, Coins, Wheat, Sparkles, X, Skull, Crown, Eye, Hammer } from 'lucide-react';

// ============ HEX MATH ============
const HEX_SIZE = 30;
const SQRT3 = Math.sqrt(3);

const hexToPixel = (q, r) => ({
  x: HEX_SIZE * SQRT3 * (q + r / 2),
  y: HEX_SIZE * 1.5 * r,
});

const hexDistance = (a, b) =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

const HEX_DIRS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

const neighbors = (q, r) => HEX_DIRS.map((d) => ({ q: q + d.q, r: r + d.r }));

const hexKey = (q, r) => `${q},${r}`;
const parseKey = (k) => { const [q, r] = k.split(',').map(Number); return { q, r }; };

const hexPoints = (cx, cy, size = HEX_SIZE) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
};

// ============ GAME DATA ============
const TERRAIN = {
  grass:    { color: '#8fb96a', edge: '#6d9350', name: 'Grassland', passable: true, defense: 0, yield: { food: 1 } },
  forest:   { color: '#4f7a3e', edge: '#3a5c2e', name: 'Forest',    passable: true, defense: 2, yield: { food: 1 } },
  hills:    { color: '#b09060', edge: '#876a42', name: 'Hills',     passable: true, defense: 1, yield: { gold: 1 } },
  mountain: { color: '#7a7267', edge: '#554f48', name: 'Mountain',  passable: false, defense: 0, yield: {} },
  water:    { color: '#4c82b3', edge: '#32608a', name: 'River',     passable: false, defense: 0, yield: {} },
  coast:    { color: '#6fa5cc', edge: '#4c82b3', name: 'Coast',     passable: true, defense: 0, yield: { gold: 1 } },
};

const UNIT_TYPES = {
  knight:    { name: 'Knight',    hp: 12, atk: 5, mov: 2, range: 1, cost: { gold: 4, food: 2 }, glyph: '⚔',  color: '#4a6cc4' },
  mage:      { name: 'Mage',      hp: 7,  atk: 6, mov: 2, range: 2, cost: { gold: 5, food: 3 }, glyph: '✦',  color: '#8b4ec4' },
  barbarian: { name: 'Barbarian', hp: 14, atk: 4, mov: 2, range: 1, cost: { gold: 4, food: 2 }, glyph: '⚒',  color: '#b85c3a' },
  rogue:     { name: 'Rogue',     hp: 8,  atk: 4, mov: 3, range: 1, cost: { gold: 3, food: 1 }, glyph: '⚝',  color: '#3aa870' },
  skeleton:  { name: 'Skeleton',  hp: 9,  atk: 4, mov: 2, range: 1, cost: { gold: 3, food: 2 }, glyph: '☠',  color: '#c4c4c4' },
  wraith:    { name: 'Wraith',    hp: 7,  atk: 5, mov: 3, range: 1, cost: { gold: 4, food: 3 }, glyph: '♆',  color: '#8a7ab8' },
  lich:      { name: 'Lich',      hp: 10, atk: 6, mov: 2, range: 2, cost: { gold: 5, food: 4 }, glyph: '⸸',  color: '#5a3a7a' },
};

const BUILDINGS = {
  granary:     { name: 'Granary',      desc: '+2 Food per turn',            cost: { gold: 3, food: 4 }, icon: '🌾' },
  market:      { name: 'Market',       desc: '+2 Gold per turn',            cost: { gold: 4, food: 3 }, icon: '💰' },
  walls:       { name: 'Walls',        desc: '+15 City HP, +2 Regen/turn',  cost: { gold: 4, food: 3 }, icon: '🏯' },
  barracks:    { name: 'Barracks',     desc: 'New units gain +2 Max HP',    cost: { gold: 5, food: 5 }, icon: '🛡' },
  watchtower:  { name: 'Watchtower',   desc: 'Reveals distant lands',       cost: { gold: 3, food: 2 }, icon: '🗼' },
  tavern:      { name: 'Tavern',       desc: 'Draw +1 card per turn',       cost: { gold: 5, food: 4 }, icon: '🍻' },
  war_council: { name: 'War Council',  desc: '+1 Orders per turn',          cost: { gold: 6, food: 6 }, icon: '📜' },
};

const CARD_POOL = [
  { id: 'march',   name: 'Forced March', desc: '+2 Move to a unit this turn', cost: 1, target: 'ally_unit' },
  { id: 'rally',   name: 'Rally',        desc: '+2 Attack to all your units', cost: 2, target: 'none' },
  { id: 'harvest', name: 'Harvest',      desc: 'Gain 6 Gold',                 cost: 0, target: 'none' },
  { id: 'heal',    name: 'Healing Hand', desc: 'Restore 5 HP to an ally',     cost: 1, target: 'ally_unit' },
  { id: 'scout',   name: 'Scout',        desc: 'Reveal a 2-hex area',         cost: 1, target: 'tile' },
  { id: 'hex',     name: 'Curse',        desc: 'Deal 4 damage to an enemy',   cost: 2, target: 'enemy_unit' },
  { id: 'muster',  name: 'Muster',       desc: 'Draw 2 cards',                cost: 1, target: 'none' },
  { id: 'feast',   name: 'Royal Feast',  desc: 'Gain 4 Gold and 4 Food',      cost: 1, target: 'none' },
];

// ============ MAP GEN ============
const MAP_COLS = 11;
const MAP_ROWS = 8;

const mulberry32 = (seed) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateMap = (seed = Date.now() & 0xffff) => {
  const rng = mulberry32(seed);
  const tiles = {};
  for (let r = 0; r < MAP_ROWS; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < MAP_COLS - rOffset; q++) {
      const roll = rng();
      let type;
      const cx = Math.floor(MAP_COLS / 2) - rOffset;
      if (r >= 3 && r <= 4 && Math.abs(q - cx) < 1 && rng() > 0.3) type = 'water';
      else if (roll < 0.08) type = 'mountain';
      else if (roll < 0.22) type = 'forest';
      else if (roll < 0.32) type = 'hills';
      else if (roll < 0.38 && (q < 1 - rOffset || q > MAP_COLS - 2 - rOffset)) type = 'coast';
      else type = 'grass';
      tiles[hexKey(q, r)] = { q, r, type };
    }
  }
  const safe = [
    { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 },
    { q: MAP_COLS - 2, r: MAP_ROWS - 1 }, { q: MAP_COLS - 3, r: MAP_ROWS - 1 },
  ];
  safe.forEach(({ q, r }) => {
    const rOff = Math.floor(r / 2);
    const key = hexKey(q - rOff, r);
    if (tiles[key]) tiles[key].type = 'grass';
  });
  return tiles;
};

// ============ LOGIC HELPERS ============
const shuffle = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const makeStarterDeck = () => {
  const deck = [];
  let uid = 1;
  CARD_POOL.forEach((c) => {
    const copies = c.cost <= 1 ? 2 : 1;
    for (let i = 0; i < copies; i++) deck.push({ ...c, uid: uid++ });
  });
  return shuffle(deck);
};

const initialState = (seed) => {
  const map = generateMap(seed);
  const playerStart = { q: 0, r: 0 };
  const aiStart = { q: MAP_COLS - 2 - Math.floor((MAP_ROWS - 1) / 2), r: MAP_ROWS - 1 };

  const deck = makeStarterDeck();
  const hand = deck.splice(0, 4);

  let uid = 1;
  const mkUnit = (type, q, r, faction) => ({
    id: uid++, type, faction, q, r,
    hp: UNIT_TYPES[type].hp, maxHp: UNIT_TYPES[type].hp,
    moved: 0, acted: false, atkBuff: 0, movBuff: 0,
  });

  return {
    turn: 1,
    activeFaction: 'player',
    seed,
    map,
    cities: [
      { id: 1, faction: 'player', q: playerStart.q, r: playerStart.r, name: 'Aldermere', hp: 20, maxHp: 20 },
      { id: 2, faction: 'ai',     q: aiStart.q,     r: aiStart.r,     name: 'Grimhold',  hp: 20, maxHp: 20 },
    ],
    units: [
      mkUnit('knight', 0, 0, 'player'),
      mkUnit('rogue', 1, 0, 'player'),
      mkUnit('skeleton', aiStart.q, aiStart.r, 'ai'),
      mkUnit('wraith', aiStart.q - 1, aiStart.r, 'ai'),
    ],
    player: {
      gold: 5, food: 5,
      deck, hand, discard: [],
      orders: 3,
      rallyActive: false,
      buildings: new Set(),
      explored: new Set([hexKey(0, 0), hexKey(1, 0), hexKey(0, 1), hexKey(-1, 1), hexKey(1, -1)]),
    },
    ai: {
      gold: 5, food: 5,
      buildings: new Set(),
    },
    status: 'playing',
    log: [{ turn: 1, faction: 'system', text: 'The kingdom of Aldermere rises. Undead stir in the north...' }],
    targeting: null,
  };
};

const revealArea = (explored, q, r, radius = 2) => {
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const ds = -dq - dr;
      if (Math.abs(dq) + Math.abs(dr) + Math.abs(ds) <= 2 * radius) {
        explored.add(hexKey(q + dq, r + dr));
      }
    }
  }
};

const computeMoveRange = (unit, state) => {
  const reachable = new Map();
  const maxMov = UNIT_TYPES[unit.type].mov + unit.movBuff - unit.moved;
  if (maxMov <= 0) return reachable;

  const queue = [{ q: unit.q, r: unit.r, cost: 0 }];
  reachable.set(hexKey(unit.q, unit.r), 0);

  while (queue.length) {
    const { q, r, cost } = queue.shift();
    if (cost >= maxMov) continue;
    for (const n of neighbors(q, r)) {
      const key = hexKey(n.q, n.r);
      const tile = state.map[key];
      if (!tile || !TERRAIN[tile.type].passable) continue;
      const unitAt = state.units.find((u) => u.q === n.q && u.r === n.r && u.id !== unit.id);
      if (unitAt) continue;
      const cityAt = state.cities.find((c) => c.q === n.q && c.r === n.r);
      if (cityAt && cityAt.faction !== unit.faction) continue;
      const newCost = cost + 1;
      if (!reachable.has(key) || reachable.get(key) > newCost) {
        reachable.set(key, newCost);
        queue.push({ q: n.q, r: n.r, cost: newCost });
      }
    }
  }
  reachable.delete(hexKey(unit.q, unit.r));
  return reachable;
};

const computeAttackTargets = (unit, state) => {
  const targets = [];
  const range = UNIT_TYPES[unit.type].range;
  state.units.forEach((u) => {
    if (u.faction === unit.faction) return;
    if (hexDistance({ q: unit.q, r: unit.r }, { q: u.q, r: u.r }) <= range) {
      targets.push({ type: 'unit', target: u });
    }
  });
  state.cities.forEach((c) => {
    if (c.faction === unit.faction) return;
    if (hexDistance({ q: unit.q, r: unit.r }, { q: c.q, r: c.r }) <= range) {
      targets.push({ type: 'city', target: c });
    }
  });
  return targets;
};

// ============ COMPONENT ============
export default function HelmetsClash() {
  const [state, setState] = useState(() => initialState(Math.floor(Math.random() * 10000)));
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [hoveredHex, setHoveredHex] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [recentlyDamaged, setRecentlyDamaged] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityTab, setCityTab] = useState('recruit'); // 'recruit' | 'build'

  const moveRange = useMemo(() => {
    if (!selectedUnit) return new Map();
    const u = state.units.find((x) => x.id === selectedUnit);
    if (!u || u.faction !== 'player') return new Map();
    return computeMoveRange(u, state);
  }, [selectedUnit, state]);

  const attackTargets = useMemo(() => {
    if (!selectedUnit) return [];
    const u = state.units.find((x) => x.id === selectedUnit);
    if (!u || u.faction !== 'player' || u.acted) return [];
    return computeAttackTargets(u, state);
  }, [selectedUnit, state]);

  const flashDamage = (id) => {
    setRecentlyDamaged((d) => ({ ...d, [id]: Date.now() }));
    setTimeout(() => {
      setRecentlyDamaged((d) => { const n = { ...d }; delete n[id]; return n; });
    }, 600);
  };

  const resolveCombat = (attacker, defender) => {
    const atkType = UNIT_TYPES[attacker.type];
    const dmg = Math.max(1, atkType.atk + (attacker.atkBuff || 0));
    defender.hp -= dmg;
    flashDamage(defender.id || `city-${defender.name}`);

    if (defender.hp > 0 && UNIT_TYPES[defender.type] &&
        hexDistance(attacker, defender) <= UNIT_TYPES[defender.type].range) {
      const counter = Math.max(1, Math.floor(UNIT_TYPES[defender.type].atk * 0.6));
      attacker.hp -= counter;
      flashDamage(attacker.id);
    }
    return dmg;
  };

  const handleHexClick = (q, r) => {
    if (state.status !== 'playing' || state.activeFaction !== 'player' || aiThinking) return;
    if (state.targeting) return handleTargetClick(q, r);

    const unitAt = state.units.find((u) => u.q === q && u.r === r);
    const cityAt = state.cities.find((c) => c.q === q && c.r === r);

    if (selectedUnit) {
      const unit = state.units.find((u) => u.id === selectedUnit);
      if (!unit) { setSelectedUnit(null); return; }

      if (unitAt && unitAt.faction === 'player' && unitAt.id !== selectedUnit) {
        setSelectedUnit(unitAt.id);
        return;
      }

      const atkTarget = attackTargets.find((t) => t.target.q === q && t.target.r === r);
      if (atkTarget && !unit.acted) {
        setState((s) => {
          const ns = { ...s, units: s.units.map((u) => ({ ...u })), cities: s.cities.map((c) => ({ ...c })) };
          const atk = ns.units.find((u) => u.id === unit.id);
          let defender;
          if (atkTarget.type === 'unit') {
            defender = ns.units.find((u) => u.id === atkTarget.target.id);
          } else {
            defender = ns.cities.find((c) => c.id === atkTarget.target.id);
            defender.type = 'city';
          }
          const dmg = resolveCombat(atk, defender);
          atk.acted = true;
          atk.moved = UNIT_TYPES[atk.type].mov;

          if (atkTarget.type === 'unit' && defender.hp <= 0) {
            ns.units = ns.units.filter((u) => u.id !== defender.id);
            ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: `${UNIT_TYPES[atk.type].name} slays a ${UNIT_TYPES[defender.type].name}!` }];
          } else if (atkTarget.type === 'city' && defender.hp <= 0) {
            ns.cities = ns.cities.filter((c) => c.id !== defender.id);
            ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: `${defender.name} has fallen!` }];
            if (defender.faction === 'ai') ns.status = 'won';
          } else {
            ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: `${UNIT_TYPES[atk.type].name} strikes for ${dmg} damage.` }];
          }
          if (atk.hp <= 0) ns.units = ns.units.filter((u) => u.id !== atk.id);
          return ns;
        });
        setSelectedUnit(null);
        return;
      }

      const moveCost = moveRange.get(hexKey(q, r));
      if (moveCost !== undefined && !unitAt && !cityAt) {
        setState((s) => {
          const ns = { ...s, units: s.units.map((u) => ({ ...u })), player: { ...s.player, explored: new Set(s.player.explored) } };
          const u = ns.units.find((x) => x.id === unit.id);
          u.q = q; u.r = r;
          u.moved += moveCost;
          revealArea(ns.player.explored, q, r, 1);
          return ns;
        });
        setSelectedUnit(unit.id);
        return;
      }

      setSelectedUnit(null);
      return;
    }

    if (unitAt && unitAt.faction === 'player') {
      setSelectedUnit(unitAt.id);
      return;
    }

    if (cityAt && cityAt.faction === 'player') {
      setCityModalOpen(true);
    }
  };

  const handleTargetClick = (q, r) => {
    const { card } = state.targeting;
    const unitAt = state.units.find((u) => u.q === q && u.r === r);
    let valid = false;
    let effectLog = '';

    setState((s) => {
      const ns = {
        ...s,
        units: s.units.map((u) => ({ ...u })),
        player: { ...s.player, hand: [...s.player.hand], discard: [...s.player.discard], explored: new Set(s.player.explored) },
      };

      if (card.target === 'ally_unit' && unitAt && unitAt.faction === 'player') {
        const u = ns.units.find((x) => x.id === unitAt.id);
        if (card.id === 'march') { u.movBuff += 2; effectLog = `${UNIT_TYPES[u.type].name} marches forth!`; valid = true; }
        else if (card.id === 'heal') { u.hp = Math.min(u.maxHp, u.hp + 5); effectLog = `${UNIT_TYPES[u.type].name} is mended.`; valid = true; }
      } else if (card.target === 'enemy_unit' && unitAt && unitAt.faction === 'ai') {
        if (ns.player.explored.has(hexKey(q, r))) {
          const u = ns.units.find((x) => x.id === unitAt.id);
          u.hp -= 4;
          flashDamage(u.id);
          if (u.hp <= 0) ns.units = ns.units.filter((x) => x.id !== u.id);
          effectLog = `A curse withers the ${UNIT_TYPES[unitAt.type].name}.`;
          valid = true;
        }
      } else if (card.target === 'tile' && s.map[hexKey(q, r)]) {
        revealArea(ns.player.explored, q, r, 2);
        effectLog = 'Scouts map the distant lands.';
        valid = true;
      }

      if (valid) {
        ns.player.hand = ns.player.hand.filter((c) => c.uid !== card.uid);
        ns.player.discard.push(card);
        ns.player.orders -= card.cost;
        ns.targeting = null;
        ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: effectLog }];
      }
      return ns;
    });
  };

  const playCard = (card) => {
    if (state.targeting || state.activeFaction !== 'player' || aiThinking) return;
    if (state.player.orders < card.cost) return;

    if (card.target !== 'none') {
      setState((s) => ({ ...s, targeting: { card } }));
      return;
    }

    setState((s) => {
      const ns = {
        ...s,
        units: s.units.map((u) => ({ ...u })),
        player: {
          ...s.player,
          hand: s.player.hand.filter((c) => c.uid !== card.uid),
          discard: [...s.player.discard, card],
          orders: s.player.orders - card.cost,
          rallyActive: s.player.rallyActive,
          deck: [...s.player.deck],
        },
      };
      let logMsg = '';
      if (card.id === 'rally') {
        ns.units.forEach((u) => { if (u.faction === 'player') u.atkBuff += 2; });
        ns.player.rallyActive = true;
        logMsg = 'Your banners rise — the host is rallied!';
      } else if (card.id === 'harvest') {
        ns.player.gold += 6;
        logMsg = 'Granaries swell by +6 gold.';
      } else if (card.id === 'muster') {
        const deck = [...ns.player.deck];
        let disc = [...ns.player.discard];
        const drawn = [];
        for (let i = 0; i < 2; i++) {
          if (!deck.length && disc.length) {
            deck.push(...shuffle(disc));
            disc = [];
          }
          if (deck.length) drawn.push(deck.pop());
        }
        ns.player.deck = deck;
        ns.player.discard = disc;
        ns.player.hand = [...ns.player.hand, ...drawn];
        logMsg = `Scribes compile ${drawn.length} new plans.`;
      } else if (card.id === 'feast') {
        ns.player.gold += 4;
        ns.player.food += 4;
        logMsg = 'The Royal Feast fills every coffer and table.';
      }
      ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: logMsg }];
      return ns;
    });
  };

  const cancelTargeting = () => setState((s) => ({ ...s, targeting: null }));

  const recruitUnit = (type) => {
    const def = UNIT_TYPES[type];
    if (state.player.gold < def.cost.gold || state.player.food < def.cost.food) return;
    const city = state.cities.find((c) => c.faction === 'player');
    if (!city) return;

    const candidates = [{ q: city.q, r: city.r }, ...neighbors(city.q, city.r)];
    const free = candidates.find((c) => {
      const tile = state.map[hexKey(c.q, c.r)];
      if (!tile || !TERRAIN[tile.type].passable) return false;
      return !state.units.find((u) => u.q === c.q && u.r === c.r);
    });
    if (!free) return;

    setState((s) => {
      const barracksBuff = s.player.buildings.has('barracks') ? 2 : 0;
      const newUnit = {
        id: Math.max(0, ...s.units.map((u) => u.id)) + 1,
        type, faction: 'player',
        q: free.q, r: free.r,
        hp: def.hp + barracksBuff, maxHp: def.hp + barracksBuff,
        moved: def.mov, acted: true,
        atkBuff: 0, movBuff: 0,
      };
      const bufText = barracksBuff ? ' (veteran)' : '';
      return {
        ...s,
        units: [...s.units, newUnit],
        player: {
          ...s.player,
          gold: s.player.gold - def.cost.gold,
          food: s.player.food - def.cost.food,
        },
        log: [...s.log.slice(-20), { turn: s.turn, faction: 'player', text: `A ${def.name}${bufText} enlists in Aldermere.` }],
      };
    });
  };

  const constructBuilding = (bldgId) => {
    if (state.activeFaction !== 'player' || aiThinking) return;
    const bldg = BUILDINGS[bldgId];
    if (!bldg) return;
    if (state.player.buildings.has(bldgId)) return;
    if (state.player.gold < bldg.cost.gold || state.player.food < bldg.cost.food) return;

    setState((s) => {
      const ns = {
        ...s,
        cities: s.cities.map((c) => ({ ...c })),
        player: {
          ...s.player,
          buildings: new Set(s.player.buildings),
          explored: new Set(s.player.explored),
          gold: s.player.gold - bldg.cost.gold,
          food: s.player.food - bldg.cost.food,
        },
      };
      ns.player.buildings.add(bldgId);

      // Immediate effects
      if (bldgId === 'walls') {
        ns.cities = ns.cities.map((c) =>
          c.faction === 'player' ? { ...c, maxHp: c.maxHp + 15, hp: c.hp + 15 } : c
        );
      }
      if (bldgId === 'watchtower') {
        const city = ns.cities.find((c) => c.faction === 'player');
        if (city) revealArea(ns.player.explored, city.q, city.r, 3);
      }
      if (bldgId === 'war_council') {
        ns.player.orders = Math.max(ns.player.orders, 4);
      }

      ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'player', text: `${bldg.name} constructed in Aldermere.` }];
      return ns;
    });
  };

  const endTurn = () => {
    if (state.activeFaction !== 'player' || aiThinking || state.status !== 'playing') return;

    setState((s) => {
      const ns = { ...s };
      const pCity = s.cities.find((c) => c.faction === 'player');
      let goldGain = 2, foodGain = 2;

      if (pCity) {
        [{ q: pCity.q, r: pCity.r }, ...neighbors(pCity.q, pCity.r)].forEach((n) => {
          const tile = s.map[hexKey(n.q, n.r)];
          if (tile) {
            const y = TERRAIN[tile.type].yield;
            goldGain += y.gold || 0;
            foodGain += y.food || 0;
          }
        });

        // Building yields
        if (s.player.buildings.has('market')) goldGain += 2;
        if (s.player.buildings.has('granary')) foodGain += 2;

        // City regen
        const wallsRegen = s.player.buildings.has('walls') ? 2 : 0;
        ns.cities = ns.cities.map((c) =>
          c.id === pCity.id ? { ...c, hp: Math.min(c.maxHp, c.hp + 2 + wallsRegen) } : c
        );
      }

      ns.player = { ...s.player, gold: s.player.gold + goldGain, food: s.player.food + foodGain };
      ns.log = [...s.log.slice(-20), { turn: s.turn, faction: 'player', text: `Turn ${s.turn}: +${goldGain} gold, +${foodGain} food.` }];
      ns.activeFaction = 'ai';
      return ns;
    });
    setSelectedUnit(null);
    setAiThinking(true);
  };

  useEffect(() => {
    if (state.activeFaction !== 'ai' || state.status !== 'playing') return;
    const timer = setTimeout(() => runAITurn(), 900);
    return () => clearTimeout(timer);
  }, [state.activeFaction, state.status]);

  const runAITurn = () => {
    setState((s) => {
      const ns = {
        ...s,
        units: s.units.map((u) => ({ ...u })),
        cities: s.cities.map((c) => ({ ...c })),
        ai: { ...s.ai, buildings: new Set(s.ai.buildings) },
      };

      // AI yields
      const aiCity = ns.cities.find((c) => c.faction === 'ai');
      let aiGoldGain = 3, aiFoodGain = 3;
      if (ns.ai.buildings.has('market')) aiGoldGain += 2;
      if (ns.ai.buildings.has('granary')) aiFoodGain += 2;
      ns.ai.gold += aiGoldGain;
      ns.ai.food += aiFoodGain;

      if (aiCity) {
        const aiWallsRegen = ns.ai.buildings.has('walls') ? 2 : 0;
        aiCity.hp = Math.min(aiCity.maxHp, aiCity.hp + 2 + aiWallsRegen);
      }

      // Reset AI unit turn flags
      ns.units.forEach((u) => { if (u.faction === 'ai') { u.moved = 0; u.acted = false; } });

      // AI unit actions
      const aiUnits = ns.units.filter((u) => u.faction === 'ai');
      const playerTargets = [
        ...ns.units.filter((u) => u.faction === 'player').map((u) => ({ q: u.q, r: u.r, ref: u, kind: 'unit' })),
        ...ns.cities.filter((c) => c.faction === 'player').map((c) => ({ q: c.q, r: c.r, ref: c, kind: 'city' })),
      ];

      aiUnits.forEach((unit) => {
        if (!playerTargets.length) return;
        let best = null, bestD = Infinity;
        playerTargets.forEach((t) => {
          const d = hexDistance(unit, t);
          if (d < bestD) { bestD = d; best = t; }
        });
        if (!best) return;

        const atkR = UNIT_TYPES[unit.type].range;
        if (bestD <= atkR) {
          performAIAttack(unit, best, ns);
          return;
        }

        const path = findPathToward(unit, best, ns);
        if (path.length > 0) {
          const moveBudget = UNIT_TYPES[unit.type].mov;
          const step = Math.min(path.length, moveBudget);
          const destination = path[step - 1];
          unit.q = destination.q;
          unit.r = destination.r;
          unit.moved = step;
          if (hexDistance(unit, best) <= atkR) {
            performAIAttack(unit, best, ns);
          }
        }
      });

      // AI construction (one per turn, priority order)
      const aiBuildOrder = ['granary', 'market', 'walls', 'barracks'];
      for (const id of aiBuildOrder) {
        if (ns.ai.buildings.has(id)) continue;
        const bldg = BUILDINGS[id];
        if (ns.ai.gold >= bldg.cost.gold && ns.ai.food >= bldg.cost.food) {
          ns.ai.buildings.add(id);
          ns.ai.gold -= bldg.cost.gold;
          ns.ai.food -= bldg.cost.food;
          if (id === 'walls' && aiCity) {
            aiCity.maxHp += 15;
            aiCity.hp += 15;
          }
          ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'ai', text: `Grimhold raises ${bldg.name}.` }];
          break;
        }
      }

      // AI recruiting
      if (aiCity) {
        const types = ['skeleton', 'wraith', 'lich'];
        for (const t of types) {
          const def = UNIT_TYPES[t];
          if (ns.ai.gold < def.cost.gold || ns.ai.food < def.cost.food) continue;
          const candidates = [{ q: aiCity.q, r: aiCity.r }, ...neighbors(aiCity.q, aiCity.r)];
          const free = candidates.find((c) => {
            const tile = ns.map[hexKey(c.q, c.r)];
            return tile && TERRAIN[tile.type].passable && !ns.units.find((u) => u.q === c.q && u.r === c.r);
          });
          if (free && Math.random() < 0.6) {
            const barracksBuff = ns.ai.buildings.has('barracks') ? 2 : 0;
            ns.units.push({
              id: Math.max(0, ...ns.units.map((u) => u.id)) + 1,
              type: t, faction: 'ai',
              q: free.q, r: free.r,
              hp: def.hp + barracksBuff, maxHp: def.hp + barracksBuff,
              moved: 0, acted: true, atkBuff: 0, movBuff: 0,
            });
            ns.ai.gold -= def.cost.gold;
            ns.ai.food -= def.cost.food;
            ns.log = [...ns.log.slice(-20), { turn: ns.turn, faction: 'ai', text: `A ${def.name} rises from the catacombs.` }];
            break;
          }
        }
      }

      // End of AI turn
      ns.turn += 1;
      ns.activeFaction = 'player';

      ns.units.forEach((u) => {
        if (u.faction === 'player') {
          u.moved = 0; u.acted = false;
          u.movBuff = 0;
          if (!ns.player.rallyActive) u.atkBuff = 0;
        }
      });

      const ordersBonus = ns.player.buildings.has('war_council') ? 1 : 0;
      ns.player = {
        ...ns.player,
        orders: 3 + ordersBonus,
        rallyActive: false,
        hand: [...ns.player.hand],
        deck: [...ns.player.deck],
        discard: [...ns.player.discard],
      };
      ns.units.forEach((u) => { if (u.faction === 'player') u.atkBuff = 0; });

      // Draw cards (+1 if tavern)
      const drawCount = 1 + (ns.player.buildings.has('tavern') ? 1 : 0);
      for (let i = 0; i < drawCount; i++) {
        if (ns.player.hand.length >= 7) break;
        if (!ns.player.deck.length && ns.player.discard.length) {
          ns.player.deck = shuffle(ns.player.discard);
          ns.player.discard = [];
        }
        if (ns.player.deck.length) ns.player.hand.push(ns.player.deck.pop());
      }

      // Reveal tiles
      const explored = new Set(ns.player.explored);
      ns.units.filter((u) => u.faction === 'player').forEach((u) => revealArea(explored, u.q, u.r, 1));
      ns.cities.filter((c) => c.faction === 'player').forEach((c) => {
        const radius = ns.player.buildings.has('watchtower') ? 3 : 2;
        revealArea(explored, c.q, c.r, radius);
      });
      ns.player.explored = explored;

      const playerCity = ns.cities.find((c) => c.faction === 'player');
      const aiCityAfter = ns.cities.find((c) => c.faction === 'ai');
      if (!playerCity) ns.status = 'lost';
      else if (!aiCityAfter) ns.status = 'won';

      return ns;
    });
    setAiThinking(false);
  };

  const performAIAttack = (attacker, target, ns) => {
    const atkType = UNIT_TYPES[attacker.type];
    const dmg = atkType.atk;
    target.ref.hp -= dmg;
    flashDamage(target.ref.id);

    if (target.kind === 'unit' && target.ref.hp > 0) {
      const defType = UNIT_TYPES[target.ref.type];
      if (hexDistance(attacker, target.ref) <= defType.range) {
        const counter = Math.max(1, Math.floor(defType.atk * 0.6));
        attacker.hp -= counter;
        flashDamage(attacker.id);
      }
    }

    ns.log = [...ns.log.slice(-20), {
      turn: ns.turn, faction: 'ai',
      text: `${UNIT_TYPES[attacker.type].name} strikes ${target.kind === 'city' ? target.ref.name : UNIT_TYPES[target.ref.type].name} for ${dmg}.`
    }];

    if (target.kind === 'unit' && target.ref.hp <= 0) ns.units = ns.units.filter((u) => u.id !== target.ref.id);
    else if (target.kind === 'city' && target.ref.hp <= 0) ns.cities = ns.cities.filter((c) => c.id !== target.ref.id);
    if (attacker.hp <= 0) ns.units = ns.units.filter((u) => u.id !== attacker.id);
    attacker.acted = true;
  };

  const findPathToward = (unit, target, ns) => {
    const start = { q: unit.q, r: unit.r };
    const visited = new Map();
    visited.set(hexKey(start.q, start.r), null);
    const queue = [start];

    while (queue.length) {
      const cur = queue.shift();
      if (cur.q === target.q && cur.r === target.r) break;
      for (const n of neighbors(cur.q, cur.r)) {
        const key = hexKey(n.q, n.r);
        if (visited.has(key)) continue;
        const tile = ns.map[key];
        if (!tile || !TERRAIN[tile.type].passable) continue;
        const isTarget = n.q === target.q && n.r === target.r;
        if (!isTarget) {
          const unitAt = ns.units.find((u) => u.q === n.q && u.r === n.r);
          if (unitAt) continue;
          const cityAt = ns.cities.find((c) => c.q === n.q && c.r === n.r);
          if (cityAt) continue;
        }
        visited.set(key, { q: cur.q, r: cur.r });
        queue.push(n);
      }
    }

    let endCoord = null;
    const targetKey = hexKey(target.q, target.r);
    if (visited.has(targetKey)) {
      endCoord = visited.get(targetKey);
    } else {
      let bestKey = null, bestD = Infinity;
      for (const k of visited.keys()) {
        const { q, r } = parseKey(k);
        const d = hexDistance({ q, r }, target);
        if (d < bestD) { bestD = d; bestKey = k; }
      }
      if (bestKey) endCoord = parseKey(bestKey);
    }

    if (!endCoord) return [];
    const path = [];
    let cur = endCoord;
    while (cur && (cur.q !== start.q || cur.r !== start.r)) {
      path.unshift(cur);
      cur = visited.get(hexKey(cur.q, cur.r));
    }
    return path;
  };

  // ========== RENDER ==========
  const sortedTileKeys = useMemo(() => Object.keys(state.map), [state.map]);
  const viewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const key of sortedTileKeys) {
      const { q, r } = parseKey(key);
      const { x, y } = hexToPixel(q, r);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const pad = HEX_SIZE + 10;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [sortedTileKeys]);

  const selectedUnitObj = state.units.find((u) => u.id === selectedUnit);
  const maxOrders = 3 + (state.player.buildings.has('war_council') ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 text-stone-800" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
      <div className="max-w-7xl mx-auto p-3">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <Crown className="text-amber-700" size={28} />
            <div>
              <div className="text-2xl font-bold tracking-wide text-stone-800">Helmets Clash</div>
              <div className="text-xs text-stone-500 -mt-1">Prototype</div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/70 backdrop-blur rounded-lg px-4 py-2 shadow-sm border border-stone-200">
            <Stat icon={<Coins size={18} className="text-amber-600" />} label="Gold" value={state.player.gold} />
            <Stat icon={<Wheat size={18} className="text-yellow-700" />} label="Food" value={state.player.food} />
            <Stat icon={<Sparkles size={18} className="text-indigo-600" />} label="Orders" value={`${state.player.orders}/${maxOrders}`} />
            <div className="h-8 w-px bg-stone-300" />
            <div className="text-sm">
              <div className="text-xs text-stone-500">Turn</div>
              <div className="font-bold">{state.turn} · {state.activeFaction === 'player' ? 'Yours' : 'Enemy'}</div>
            </div>
            <button
              onClick={endTurn}
              disabled={state.activeFaction !== 'player' || aiThinking || state.status !== 'playing'}
              className="ml-2 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 disabled:text-stone-500 text-white font-semibold px-4 py-2 rounded shadow transition"
            >
              End Turn
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="text-stone-600 hover:text-stone-900 p-1"
              title="Help"
            >
              <Eye size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
          {/* MAP */}
          <div className="relative bg-gradient-to-b from-sky-100 to-amber-50 rounded-lg border-2 border-stone-300 shadow-inner overflow-hidden">
            {state.targeting && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-indigo-900 text-white px-4 py-2 rounded shadow flex items-center gap-3">
                <span className="text-sm">Select target for <b>{state.targeting.card.name}</b></span>
                <button onClick={cancelTargeting} className="hover:text-red-200"><X size={16} /></button>
              </div>
            )}
            {aiThinking && (
              <div className="absolute top-2 right-2 z-20 bg-stone-800/90 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2">
                <Skull size={16} className="animate-pulse" /> Enemy plotting...
              </div>
            )}
            <svg viewBox={viewBox} className="w-full" style={{ maxHeight: '70vh' }}>
              {sortedTileKeys.map((key) => {
                const { q, r } = parseKey(key);
                const tile = state.map[key];
                const { x, y } = hexToPixel(q, r);
                const terrain = TERRAIN[tile.type];
                const explored = state.player.explored.has(key);
                const isMoveHex = moveRange.has(key);
                const isAttackHex = attackTargets.some((t) => t.target.q === q && t.target.r === r);
                const isHovered = hoveredHex === key;
                const isTargeting = !!state.targeting;

                return (
                  <g key={key} transform={`translate(${x}, ${y})`}>
                    <polygon
                      points={hexPoints(0, 0)}
                      fill={explored ? terrain.color : '#4a4a4a'}
                      stroke={isHovered ? '#ffd700' : terrain.edge}
                      strokeWidth={isHovered ? 2.5 : 1}
                      opacity={explored ? 1 : 0.55}
                      onClick={() => handleHexClick(q, r)}
                      onMouseEnter={() => setHoveredHex(key)}
                      onMouseLeave={() => setHoveredHex(null)}
                      style={{ cursor: 'pointer', transition: 'stroke 0.15s' }}
                    />
                    {explored && tile.type === 'forest' && <text x={0} y={4} textAnchor="middle" fontSize={18} opacity={0.7} pointerEvents="none">🌲</text>}
                    {explored && tile.type === 'mountain' && <text x={0} y={5} textAnchor="middle" fontSize={20} opacity={0.85} pointerEvents="none">⛰</text>}
                    {explored && tile.type === 'hills' && <text x={0} y={5} textAnchor="middle" fontSize={14} opacity={0.6} pointerEvents="none">⛰</text>}
                    {explored && tile.type === 'water' && <text x={0} y={4} textAnchor="middle" fontSize={14} opacity={0.7} pointerEvents="none">〰</text>}
                    {isMoveHex && !isAttackHex && <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#3b82f6" opacity={0.25} pointerEvents="none" />}
                    {isAttackHex && (
                      <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#dc2626" opacity={0.4} pointerEvents="none">
                        <animate attributeName="opacity" values="0.3;0.55;0.3" dur="1s" repeatCount="indefinite" />
                      </polygon>
                    )}
                    {isTargeting && explored && <polygon points={hexPoints(0, 0, HEX_SIZE - 2)} fill="#6366f1" opacity={0.15} pointerEvents="none" />}
                  </g>
                );
              })}

              {state.cities.map((city) => {
                if (!state.player.explored.has(hexKey(city.q, city.r)) && city.faction !== 'player') return null;
                const { x, y } = hexToPixel(city.q, city.r);
                const damaged = recentlyDamaged[`city-${city.name}`] || recentlyDamaged[city.id];
                return (
                  <g key={`city-${city.id}`} transform={`translate(${x}, ${y})`} pointerEvents="none">
                    <rect x={-18} y={-18} width={36} height={32} rx={3} fill={city.faction === 'player' ? '#d6b876' : '#8b6a8b'}
                      stroke={city.faction === 'player' ? '#8b6b2a' : '#3a1a3a'} strokeWidth={2}
                      opacity={damaged ? 0.5 : 1} />
                    <rect x={-14} y={-14} width={6} height={8} fill={city.faction === 'player' ? '#8b6b2a' : '#3a1a3a'} />
                    <rect x={-4} y={-14} width={6} height={8} fill={city.faction === 'player' ? '#8b6b2a' : '#3a1a3a'} />
                    <rect x={8} y={-14} width={6} height={8} fill={city.faction === 'player' ? '#8b6b2a' : '#3a1a3a'} />
                    <text x={0} y={6} textAnchor="middle" fontSize={14} fontWeight="bold" fill={city.faction === 'player' ? '#3a2a0a' : '#1a0a1a'}>
                      {city.faction === 'player' ? '♔' : '☠'}
                    </text>
                    <rect x={-18} y={16} width={36} height={4} fill="#333" />
                    <rect x={-18} y={16} width={(36 * city.hp) / city.maxHp} height={4}
                      fill={city.hp > city.maxHp * 0.5 ? '#4ade80' : city.hp > city.maxHp * 0.25 ? '#facc15' : '#ef4444'} />
                  </g>
                );
              })}

              {state.units.map((unit) => {
                const visible = unit.faction === 'player' || state.player.explored.has(hexKey(unit.q, unit.r));
                if (!visible) return null;
                const { x, y } = hexToPixel(unit.q, unit.r);
                const def = UNIT_TYPES[unit.type];
                const isSelected = unit.id === selectedUnit;
                const damaged = recentlyDamaged[unit.id];

                return (
                  <g key={`unit-${unit.id}`} transform={`translate(${x}, ${y})`}
                     style={{ cursor: unit.faction === 'player' ? 'pointer' : 'default', transition: 'transform 0.25s' }}
                     onClick={() => handleHexClick(unit.q, unit.r)}>
                    {isSelected && (
                      <circle cx={0} cy={0} r={HEX_SIZE - 6} fill="none" stroke="#ffd700" strokeWidth={2.5} strokeDasharray="3,2">
                        <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={0} cy={0} r={15} fill={def.color} stroke={unit.faction === 'player' ? '#1a3a7a' : '#3a1a1a'} strokeWidth={2}
                      opacity={damaged ? 0.4 : 1} />
                    <text x={0} y={5} textAnchor="middle" fontSize={16} fontWeight="bold" fill="white" pointerEvents="none">
                      {def.glyph}
                    </text>
                    <rect x={-16} y={16} width={32} height={3} fill="#222" />
                    <rect x={-16} y={16} width={(32 * unit.hp) / unit.maxHp} height={3}
                      fill={unit.hp > unit.maxHp * 0.5 ? '#4ade80' : unit.hp > unit.maxHp * 0.25 ? '#facc15' : '#ef4444'} />
                    {unit.acted && unit.faction === 'player' && <circle cx={12} cy={-12} r={5} fill="#666" stroke="white" strokeWidth={1} />}
                    {unit.atkBuff > 0 && unit.faction === 'player' && <text x={-14} y={-10} fontSize={11} fill="#eab308" fontWeight="bold">+{unit.atkBuff}</text>}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col gap-3">
            <InfoPanel selectedUnit={selectedUnitObj} state={state} hoveredKey={hoveredHex} />

            {/* Buildings owned */}
            <div className="bg-white/80 backdrop-blur rounded-lg border border-stone-200 p-3 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1">
                <Hammer size={14} /> Your Structures
              </div>
              {state.player.buildings.size === 0 ? (
                <div className="text-xs text-stone-500 italic">None yet. Click your city to build.</div>
              ) : (
                <div className="space-y-1">
                  {Array.from(state.player.buildings).map((id) => (
                    <div key={id} className="flex items-center gap-2 text-xs">
                      <span className="text-base">{BUILDINGS[id].icon}</span>
                      <span className="font-semibold">{BUILDINGS[id].name}</span>
                      <span className="text-stone-500 text-[10px]">· {BUILDINGS[id].desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Log */}
            <div className="bg-white/80 backdrop-blur rounded-lg border border-stone-200 p-3 shadow-sm flex-1 min-h-[150px]">
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Chronicle</div>
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {[...state.log].reverse().map((entry, i) => (
                  <div key={i} className={entry.faction === 'ai' ? 'text-purple-700' : entry.faction === 'player' ? 'text-amber-800' : 'text-stone-500 italic'}>
                    <span className="text-stone-400">T{entry.turn}:</span> {entry.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hand */}
        <div className="mt-3 bg-gradient-to-b from-amber-100 to-amber-50 rounded-lg border-2 border-amber-200 p-3 shadow-inner">
          <div className="text-xs uppercase tracking-wider text-amber-800 mb-2 font-semibold">Your Hand</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {state.player.hand.length === 0 && <div className="text-sm text-stone-500 italic">No cards in hand.</div>}
            {state.player.hand.map((card) => {
              const canPlay = state.player.orders >= card.cost && state.activeFaction === 'player' && !aiThinking && !state.targeting;
              return (
                <button key={card.uid}
                  onClick={() => playCard(card)}
                  disabled={!canPlay}
                  className={`relative shrink-0 w-36 h-28 rounded-lg border-2 p-2 text-left transition transform ${canPlay ? 'bg-gradient-to-b from-white to-amber-50 border-amber-600 hover:-translate-y-1 hover:shadow-lg cursor-pointer' : 'bg-stone-200 border-stone-400 opacity-50 cursor-not-allowed'}`}
                >
                  <div className="absolute top-1 right-1 bg-indigo-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{card.cost}</div>
                  <div className="text-sm font-bold text-stone-800 pr-5">{card.name}</div>
                  <div className="text-xs text-stone-600 mt-1">{card.desc}</div>
                </button>
              );
            })}
            <div className="shrink-0 self-center text-xs text-stone-500 pl-2 border-l border-stone-300 ml-2">
              <div>Deck: {state.player.deck.length}</div>
              <div>Discard: {state.player.discard.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Victory/Defeat */}
      {state.status !== 'playing' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-amber-100 to-amber-50 border-4 border-amber-700 rounded-lg p-8 max-w-md text-center shadow-2xl">
            <div className="text-5xl mb-4">{state.status === 'won' ? '👑' : '💀'}</div>
            <div className="text-3xl font-bold mb-2">{state.status === 'won' ? 'Victory!' : 'Defeat'}</div>
            <div className="text-stone-600 mb-4">
              {state.status === 'won' ? 'Grimhold has fallen. The realm is yours.' : 'Aldermere has fallen to the undead. Darkness spreads...'}
            </div>
            <div className="text-sm text-stone-500 mb-4">Turns played: {state.turn}</div>
            <button
              onClick={() => { setState(initialState(Math.floor(Math.random() * 10000))); setSelectedUnit(null); }}
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-2 rounded shadow"
            >
              New Campaign
            </button>
          </div>
        </div>
      )}

      {/* City modal */}
      {cityModalOpen && (() => {
        const city = state.cities.find((c) => c.faction === 'player');
        if (!city) return null;
        const unitTypes = ['knight', 'mage', 'barbarian', 'rogue'];
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setCityModalOpen(false)}>
            <div className="bg-gradient-to-b from-amber-100 to-amber-50 border-2 border-amber-700 rounded-lg p-5 max-w-xl w-full m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Castle className="text-amber-700" size={24} />
                    <h2 className="text-2xl font-bold">{city.name}</h2>
                  </div>
                  <div className="text-sm text-stone-600 mt-1 flex gap-3">
                    <span>Walls: {city.hp}/{city.maxHp}</span>
                    <span className="text-amber-700">💰 {state.player.gold}</span>
                    <span className="text-yellow-700">🌾 {state.player.food}</span>
                  </div>
                </div>
                <button onClick={() => setCityModalOpen(false)} className="text-stone-500 hover:text-stone-900"><X size={20} /></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-3 border-b-2 border-amber-200">
                <TabButton active={cityTab === 'recruit'} onClick={() => setCityTab('recruit')}>Recruit</TabButton>
                <TabButton active={cityTab === 'build'} onClick={() => setCityTab('build')}>Construct</TabButton>
              </div>

              {cityTab === 'recruit' && (
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {unitTypes.map((t) => {
                      const def = UNIT_TYPES[t];
                      const affordable = state.player.gold >= def.cost.gold && state.player.food >= def.cost.food;
                      const canRecruit = affordable && state.activeFaction === 'player';
                      const vetBuff = state.player.buildings.has('barracks');
                      return (
                        <button key={t} onClick={() => recruitUnit(t)} disabled={!canRecruit}
                          className={`text-left rounded-lg p-3 border-2 transition ${canRecruit ? 'bg-white hover:bg-amber-50 border-amber-300 cursor-pointer' : 'bg-stone-100 border-stone-300 opacity-50 cursor-not-allowed'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: def.color }}>{def.glyph}</div>
                            <div className="flex-1">
                              <div className="font-bold text-sm">{def.name}</div>
                              <div className="text-xs flex gap-2">
                                <span className="text-amber-700 font-semibold">{def.cost.gold}g</span>
                                <span className="text-yellow-700 font-semibold">{def.cost.food}f</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-stone-600">
                            {def.hp + (vetBuff ? 2 : 0)} HP{vetBuff ? ' ⬆' : ''} · {def.atk} ATK · {def.mov} MOV{def.range > 1 ? ` · R${def.range}` : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-stone-500 italic mt-3">
                    Units spawn adjacent to your city and cannot act on their first turn.
                  </div>
                </div>
              )}

              {cityTab === 'build' && (
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(BUILDINGS).map(([id, bldg]) => {
                      const owned = state.player.buildings.has(id);
                      const affordable = state.player.gold >= bldg.cost.gold && state.player.food >= bldg.cost.food;
                      const canBuild = !owned && affordable && state.activeFaction === 'player';
                      return (
                        <button
                          key={id}
                          onClick={() => constructBuilding(id)}
                          disabled={!canBuild}
                          className={`text-left rounded-lg p-3 border-2 transition ${owned ? 'bg-green-50 border-green-400 cursor-default' : canBuild ? 'bg-white hover:bg-amber-50 border-amber-300 cursor-pointer' : 'bg-stone-100 border-stone-300 opacity-50 cursor-not-allowed'}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="text-2xl">{bldg.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-sm">{bldg.name}</div>
                                {owned && <span className="text-[10px] text-green-700 font-semibold uppercase tracking-wide">Built</span>}
                              </div>
                              <div className="text-xs text-stone-600 leading-tight">{bldg.desc}</div>
                              {!owned && (
                                <div className="text-xs mt-1 flex gap-2">
                                  <span className="text-amber-700 font-semibold">{bldg.cost.gold}g</span>
                                  <span className="text-yellow-700 font-semibold">{bldg.cost.food}f</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-stone-500 italic mt-3">
                    Each structure is unique and its effects are permanent for this campaign.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Help */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-amber-50 border-2 border-amber-700 rounded-lg p-6 max-w-lg m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-2xl font-bold">How to Play</h2>
              <button onClick={() => setShowHelp(false)} className="text-stone-500 hover:text-stone-900"><X size={20} /></button>
            </div>
            <div className="text-sm space-y-2 text-stone-700">
              <p><b>Goal:</b> Destroy the enemy city (Grimhold) before they destroy yours.</p>
              <p><b>Move:</b> Click a unit, then click a blue tile to move there.</p>
              <p><b>Attack:</b> Click a red-outlined enemy in range. Melee units counter-attack.</p>
              <p><b>Cards:</b> Spend Orders (refill each turn) to play tactical cards.</p>
              <p><b>Your City:</b> Click it to <b>Recruit</b> units or <b>Construct</b> buildings.
                Both cost gold and food. Food comes from grassland and forest tiles near your city; the Granary doubles it.</p>
              <p><b>Buildings:</b> Each provides a permanent effect — +yields, +HP, +draw, +orders, or extended vision. Plan your build order.</p>
              <p className="text-xs text-stone-500 italic mt-3">Tip: Walls + Barracks early lets you survive aggression; War Council + Tavern fuels a card-combo economy.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="text-sm">
        <div className="text-xs text-stone-500 leading-none">{label}</div>
        <div className="font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition ${active ? 'border-amber-700 text-amber-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
    >
      {children}
    </button>
  );
}

function InfoPanel({ selectedUnit, state, hoveredKey }) {
  if (selectedUnit) {
    const def = UNIT_TYPES[selectedUnit.type];
    return (
      <div className="bg-white/80 backdrop-blur rounded-lg border border-stone-200 p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg"
               style={{ background: def.color }}>{def.glyph}</div>
          <div>
            <div className="font-bold">{def.name}</div>
            <div className="text-xs text-stone-500">{selectedUnit.faction === 'player' ? 'Your army' : 'Enemy'}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 text-xs mt-2">
          <Metric label="HP" value={`${selectedUnit.hp}/${selectedUnit.maxHp}`} />
          <Metric label="ATK" value={def.atk + selectedUnit.atkBuff} boosted={selectedUnit.atkBuff > 0} />
          <Metric label="MOV" value={`${def.mov + selectedUnit.movBuff - selectedUnit.moved}/${def.mov + selectedUnit.movBuff}`} />
          <Metric label="RNG" value={def.range} />
        </div>
        {selectedUnit.acted && <div className="text-xs text-stone-500 italic mt-2">Has acted this turn.</div>}
      </div>
    );
  }

  if (hoveredKey && state.map[hoveredKey]) {
    const tile = state.map[hoveredKey];
    const terrain = TERRAIN[tile.type];
    return (
      <div className="bg-white/80 backdrop-blur rounded-lg border border-stone-200 p-3 shadow-sm">
        <div className="font-bold">{terrain.name}</div>
        <div className="text-xs text-stone-500 mt-1">
          {!terrain.passable && <span className="text-red-600">Impassable · </span>}
          {terrain.defense > 0 && <span>+{terrain.defense} defense · </span>}
          {Object.entries(terrain.yield).map(([k, v]) => `+${v} ${k}`).join(', ') || 'No yield'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-stone-200 p-3 shadow-sm">
      <div className="text-sm text-stone-600">Select a unit, or hover a tile for info.</div>
    </div>
  );
}

function Metric({ label, value, boosted }) {
  return (
    <div className="bg-stone-100 rounded p-1 text-center">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`font-bold ${boosted ? 'text-amber-600' : ''}`}>{value}</div>
    </div>
  );
}

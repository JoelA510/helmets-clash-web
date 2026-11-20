import type { AttackTarget, FactionState, GameState, HexKey, Unit } from '../game/types';
import { TERRAIN, UNIT_TYPES } from '../game/constants';
import { attackPower, combatForecast, movementBudget, movementLeft } from '../game/logic';
import { cardDestination, targetedUnitStats, siegeHitPoints } from '../game/inspection';
import { parseKey } from '../game/hex';
import { Emblem } from './TabletopArt';

type Props = {
  selectedUnit?: Unit; state: GameState; viewer: FactionState; hoveredKey: HexKey;
  moveCost?: number; attack?: AttackTarget;
};

function TileInspection({ selectedUnit, state, viewer, hoveredKey, moveCost, attack }: Props) {
  const { q, r } = parseKey(hoveredKey);
  const known = viewer.explored.has(hoveredKey);
  const terrain = known && state.map[hoveredKey] ? TERRAIN[state.map[hoveredKey].type] : null;
  const occupant = known ? state.units.find(u => u.q === q && u.r === r) : undefined;
  const city = known ? state.cities.find(c => c.q === q && c.r === r) : undefined;
  const card = state.targeting?.card;
  const target = card && cardDestination(state, viewer.id, card, q, r);
  let effect = card?.id === 'sabotage' ? 'Drain up to 3 gold and 2 food.' : card?.desc;
  if (card && target?.kind === 'unit' && (card.id === 'heal' || card.id === 'march' || card.id === 'hex')) {
    const next = { ...target.unit, ...targetedUnitStats(card, target.unit) };
    if (card.id === 'march') effect = `Movement remaining: ${movementLeft(target.unit)} to ${movementLeft(next)}.`;
    else if (card.id === 'heal' && target.unit.hp === target.unit.maxHp) effect = 'Already at full health. Playing still spends the card.';
    else effect = `${UNIT_TYPES[target.unit.type].name}: ${target.unit.hp} to ${Math.max(0,next.hp)} HP.`;
  } else if (card && target?.kind === 'city') {
    effect = `${target.city.name}: ${target.city.hp} to ${Math.max(0,siegeHitPoints(target.city))} HP.`;
  }
  const forecast = known && !card && selectedUnit && attack && combatForecast(state, selectedUnit, attack);
  return <div className="tile-inspection">
    <strong>{terrain?.name ?? 'Unexplored'} <small>({q}, {r})</small></strong>
    {terrain && <p>{terrain.passable ? 'Passable' : 'Impassable'} · Defense {terrain.defense} · {Object.entries(terrain.yield).map(([k,v]) => `+${v} ${k}`).join(', ') || 'No yield'}</p>}
    {city && <p>{city.name} · City {city.hp}/{city.maxHp} HP</p>}
    {occupant && occupant.id !== selectedUnit?.id && <p>{UNIT_TYPES[occupant.type].name} · {occupant.hp}/{occupant.maxHp} HP · {attackPower(occupant)} ATK</p>}
    {card && <p>{target ? effect : 'Choose a highlighted target.'}</p>}
    {!card && known && selectedUnit && moveCost !== undefined && <p>Move costs {moveCost} · {movementLeft(selectedUnit) - moveCost} movement left.</p>}
    {forecast && selectedUnit && attack && <div>
      <p><b>{forecast.damage} damage</b> · {forecast.counter} counter. Target {Math.max(0,forecast.defender.hp)} HP, attacker {Math.max(0,forecast.attacker.hp)} HP.</p>
      <p>Attack bonus: level +{selectedUnit.level}, buff +{selectedUnit.atkBuff}.
        {forecast.modifiers && <> Flank +{forecast.modifiers.flankBonus}, Ambush +{forecast.modifiers.ambushBonus}, terrain defense {forecast.modifiers.defense}.</>}</p>
      {attack.type === 'unit' && <p>Counter uses {attackPower(attack.target)} ATK (level +{attack.target.level}, buff +{attack.target.atkBuff}) against {forecast.modifiers?.counterDefense} defense.</p>}
      {(forecast.attacker.level > selectedUnit.level || ('level' in forecast.defender && attack.type === 'unit' && forecast.defender.level > attack.target.level)) && <p>Survivor levels up and heals to full.</p>}
    </div>}
  </div>;
}

export function InfoPanel(props: Props) {
  const { selectedUnit: unit, viewer } = props;
  return <section className="table-panel" aria-label="Tile inspector">
    {unit && <div className="selected-piece">
      <div className="flex items-center gap-2"><span className="piece-badge" style={{background: viewer.color}}><Emblem kind={unit.type}/></span>
        <div><strong>{UNIT_TYPES[unit.type].name}</strong><p>{viewer.displayName} · Level {unit.level}</p></div></div>
      <dl>{Object.entries({ HP: `${unit.hp}/${unit.maxHp}`, ATK: attackPower(unit), MOV: `${movementLeft(unit)}/${movementBudget(unit)}`, RNG: UNIT_TYPES[unit.type].range }).map(([label,value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {unit.acted && <p>Has acted this turn.</p>}
    </div>}
    <TileInspection {...props} />
  </section>;
}

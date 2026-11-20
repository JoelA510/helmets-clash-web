# Initiative, army matchups and siege response

**Decision, November 20, 2026.** Keep the current initiative rules, unit stats and Ballista price. The earlier living-army mirror gave the opening seat 20 wins in 32 games. That size of advantage did not repeat with initiative and deployment varied independently. Grimhold's campaign record varied across seed groups, and the tactical fixtures showed both armies winning under different conditions.

## Campaigns

Executed 512 two-seat AI games on Medium Continents and Highlands. Each seed group contains 16 seeds and 32 maps. Every match starts from a complete pre-turn deal. The two initiative runs clone the same terrain, deployments, piece IDs, fog, hands, decks and shuffle seed. Each seat receives its start-of-turn effects exactly once per round. Subsequent choices and reshuffles can diverge.

In living-army mirrors, Aldermere and Sunspire use the same roster. A second pass exchanges their physical deployments and starting visibility while each seat retains its cards. In mixed matches, Aldermere and Grimhold each play from each spawn and move first and second. Repeated games on one map are paired observations.

| Measure | Seeds 201-216 | Seeds 401-416 |
| --- | ---: | ---: |
| Living mirror, first mover wins | 70/128 | 64/128 |
| Living mirror, original first spawn wins across seat assignments | 56/128 | 64/128 |
| Living mirror, same seat wins under either initiative | 34/64 pairs | 40/64 pairs |
| Mixed armies, first mover wins | 64/128 | 66/128 |
| Mixed armies, Grimhold wins | 62/128 | 80/128 |

One mirror timed out after round 100 (seed 415, Highlands, original spawns, f1 first). Its pair contributes to neither an initiative sweep nor a same-seat sweep. All mixed matches finished. Starting gold income was associated with wins among unequal-income mirror starts: the richer capital won 71 of 96 decided games in the first group and 51 of 95 in the second. Terrain, access routes and income vary together. These results do not establish an income adjustment.

The JSON lines include first proximity to the enemy capital and its first net HP loss, per attacker. Proximity is sampled after each AI action phase using surviving troops and their geometric attack range. Damage can also come from a card. Among mixed matches in which a faction got a unit in range, Aldermere's median arrival was round 11 (78 games) and 12 (70 games) in the two groups. Grimhold's was round 14 (66) and 18 (89). Earlier arrival alone does not explain Grimhold's higher win count in the second group.

## Controlled fights

- **Screened casters.** Each army receives 9 gold and 6 food. Knight and Mage spend 9/5, Skeleton and Lich spend 8/6. Each squad deploys with its melee piece one hex in front of its caster. Only the AI unit phase acts. Cards, new purchases and end-turn recovery are excluded. Both formations took the first strike in turn, in both board orientations. On grass the living army won all four runs in rounds 2-3. Its promoted Mage survived at 8 HP, accompanied by a 1-HP Knight when the living side struck first. With forests under the two screening pieces, the undead army won all four runs in rounds 3-5 with a promoted 11-HP Lich. These are deterministic formation comparisons.
- **Raider race.** With the same starting purse of 5/5, one Rogue costs 3/1 and one Wraith costs 4/3. Each travels seven hexes toward an opposing 20-HP capital along a separate, unobstructed grass lane. Both land their first hit on round 2. Both runners survive. With ordinary city regeneration the Wraith captures on round 7 in either turn order. Its higher attack pays off at the walls, while its extra resource cost matters in a full campaign.
- **Ballista.** A newly fielded Barracks Ballista has 9 HP. Moving from three hexes out to firing range gives the defender one action phase before the first possible shot. An exposed capital drops from 20 to 13 HP. A Knight staying in the city takes 2 damage and leaves the capital at 20. A Knight striking from outside the city reduces the Ballista to 4 HP and survives at 11, but the capital takes the shot. A Knight and Archer already in range remove the engine in that response phase and preserve all 20 city HP. These outcomes depend on defender positioning.

## Reproduction

From the repository root on Node 24 with the locked dependencies installed:

```sh
node scripts/balance-campaigns.mjs > balance.jsonl
```

Each of the 526 rows represents one trial. Campaign rows include the seed, map, seat presets in f1/f2 order, spawn swap, first actor, per-seat starting income in gold/food order, arrival and damage rounds, winner and final round. A null winner denotes a timeout. Scenario rows include survivors and HP. The original 24-game pilot remains available through `node scripts/matchups.mjs`.

Human choices, larger games and other map settings remain open for playtesting. The experiment runs locally, outside the browser build.

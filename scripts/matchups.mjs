// Local-only deterministic match harness. Vite loads the same TypeScript as the browser.
import { createServer } from 'vite';

const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const {initialState,checkVictory} = await vite.ssrLoadModule('/src/game/state.ts');
  const {applyStartOfSeatTurn,applyEndOfSeatTurn} = await vite.ssrLoadModule('/src/game/turn.ts');
  const {runAITurnFor} = await vite.ssrLoadModule('/src/game/ai.ts');
  const recruits = {}, winners = {}, rounds = [], firstBarracks = [], firstBallista = [];
  for (const seed of [1,2,3,4,5,20261120]) for (const mapType of ['continents','highlands']) {
    for (const first of ['aldermere','grimhold']) {
      const second = first === 'aldermere' ? 'grimhold' : 'aldermere';
      const seats = [first,second].map(factionPresetId => ({kind:'ai',name:factionPresetId,factionPresetId}));
      const s = initialState({seed,mapType,mapSize:'medium',seats});
      let unlocked = false, fielded = false;
      for (let round = 1; round <= 100 && !s.winner; round++) {
        s.turn = round;
        for (const seat of s.seats) {
          s.activeSeatIdx = seat.idx;
          if (round !== 1 || seat.idx !== 0) applyStartOfSeatTurn(s,seat.factionId);
          // Only this faction recruits. Existing friendly survivors retain identity
          // by id, except a dead attacker's id can immediately be reused; the
          // final recruitment log identifies the new unit in that case too.
          const oldLog = s.log.at(-1);
          runAITurnFor(s,seat.factionId);
          if (!unlocked && s.factions[seat.factionId].buildings.has('barracks')) {
            firstBarracks.push(round);
            unlocked = true;
          }
          const log = s.log.at(-1);
          if (log !== oldLog && / enlists | musters in /.test(log.text)) {
            const type = s.units.at(-1).type;
            if (type === 'ballista' && !fielded) {
              firstBallista.push(round);
              fielded = true;
            }
            recruits[type] = (recruits[type] ?? 0) + 1;
          }
          applyEndOfSeatTurn(s,seat.factionId);
          Object.assign(s,checkVictory(s));
          if (s.winner) break;
        }
      }
      const winner = s.winner ? s.factions[s.winner].factionPresetId : 'timeout';
      winners[winner] = (winners[winner] ?? 0) + 1;
      if (s.winner) rounds.push(s.turn);
      console.log(seed,mapType,first,winner,s.turn);
    }
  }
  console.log(JSON.stringify({completed:rounds.length,winners,recruits,rounds,firstBarracks,firstBallista},null,2));
} finally {
  await vite.close();
}

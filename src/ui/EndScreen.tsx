import type { FactionId, FactionState, GameState } from '../game/types';
import { Dialog } from './Dialog';

type EndScreenProps = {
  open: boolean;
  winner: FactionId | null;
  faction: FactionState | null;
  turn: number;
  state: GameState;
  onNewGame: () => void;
  onMainMenu: () => void;
};

// Compact per-faction stats table. Pulls from FactionState.totalKills +
// totalCardsPlayed + buildings.size. Rendered inside the victory dialog
// so players get a closing moment that acknowledges what they did.
function StatsTable({ state }: { state: GameState }) {
  const rows = Object.values(state.factions);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-stone-600">
          <th className="pb-1">Faction</th>
          <th className="pb-1 text-right">Kills</th>
          <th className="pb-1 text-right">Buildings</th>
          <th className="pb-1 text-right">Cards played</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id} className="border-t border-stone-200">
            <td className="py-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                style={{ background: f.color }}
              >{f.glyph}</span>
              <span className="font-semibold">{f.displayName}</span>
            </td>
            <td className="py-1 text-right tabular-nums">{f.totalKills ?? 0}</td>
            <td className="py-1 text-right tabular-nums">{f.buildings.size}</td>
            <td className="py-1 text-right tabular-nums">{f.totalCardsPlayed ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EndScreen({ open, winner, faction, turn, state, onNewGame, onMainMenu }: EndScreenProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      dismissable={false}
      title={winner ? 'Victory!' : 'The realm is silent'}
      labelledById="end-title"
      maxWidth="max-w-lg"
    >
      <div className="text-center py-2">
        <div className="text-5xl mb-3" aria-hidden="true">{winner ? '👑' : '🕊'}</div>
        {winner ? (
          <p className="text-stone-800 mb-3"><b>{faction?.displayName || winner}</b> has triumphed. All other capitals have fallen.</p>
        ) : (
          <p className="text-stone-800 mb-3">No faction remains. The realm reverts to wilderness.</p>
        )}
        <p className="text-sm text-stone-600 mb-4">Turns played: {turn}</p>
      </div>

      <section aria-labelledby="stats-heading" className="bg-white/60 rounded p-3 border border-stone-200 mb-4">
        <h3 id="stats-heading" className="text-xs uppercase tracking-wider text-stone-700 font-semibold mb-2">
          Match summary
        </h3>
        <StatsTable state={state} />
      </section>

      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={onNewGame}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          Play again (same setup)
        </button>
        <button
          type="button"
          onClick={onMainMenu}
          className="bg-stone-200 hover:bg-stone-300 text-stone-900 font-semibold px-6 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          New setup
        </button>
      </div>
    </Dialog>
  );
}

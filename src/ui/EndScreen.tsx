import type { FactionId, FactionState } from '../game/types';
import { Dialog } from './Dialog';

type EndScreenProps = {
  open: boolean;
  winner: FactionId | null;
  faction: FactionState | null;
  turn: number;
  onNewGame: () => void;
  onMainMenu: () => void;
};

export function EndScreen({ open, winner, faction, turn, onNewGame, onMainMenu }: EndScreenProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      dismissable={false}
      title={winner ? 'Victory!' : 'The realm is silent'}
      labelledById="end-title"
      maxWidth="max-w-md"
    >
      <div className="text-center py-2">
        <div className="text-5xl mb-3" aria-hidden="true">{winner ? '👑' : '🕊'}</div>
        {winner ? (
          <p className="text-stone-800 mb-3"><b>{faction?.displayName || winner}</b> has triumphed. All other capitals have fallen.</p>
        ) : (
          <p className="text-stone-800 mb-3">No faction remains. The realm reverts to wilderness.</p>
        )}
        <p className="text-sm text-stone-600 mb-5">Turns played: {turn}</p>
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
      </div>
    </Dialog>
  );
}

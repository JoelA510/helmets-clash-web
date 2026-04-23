import { Dialog } from './Dialog';

type Props = { open: boolean; onDismiss: () => void };

// First-run welcome + guided first-turn tour. Copy is intentionally
// minimal — TODO(design): iterate with an actual tutorial UX pass (step
// targets highlighting the board, animated arrows, keyboard walkthrough).
// For now this gets players oriented before they stare at a board of
// hexes wondering what to do.
export function TutorialOverlay({ open, onDismiss }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      dismissable
      title="Welcome to Helmets Clash"
      labelledById="tutorial-title"
      maxWidth="max-w-xl"
    >
      <div className="text-sm text-stone-800 space-y-3">
        <p><b>Goal:</b> Be the last faction with a city standing.</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click one of your units (the bright-bordered ones) to select it.</li>
          <li>Blue hexes show where it can move; red-outlined enemies are in attack range.</li>
          <li>Click your city to <b>Recruit</b> new units or <b>Construct</b> buildings. Both cost gold + food.</li>
          <li>Your hand (bottom of screen) holds tactical <b>cards</b>. Spending Orders plays them.</li>
          <li>When you're done, click <b>End Turn</b> (or press <kbd>E</kbd>).</li>
        </ol>
        <p className="text-xs text-stone-600 italic">
          Keyboard: arrows move a cursor, Enter acts, Esc cancels, <kbd>?</kbd> opens help.
          Settings for AI speed + high-contrast theme are behind the gear icon in the toolbar.
        </p>
        <div className="text-right pt-2">
          <button
            type="button"
            onClick={onDismiss}
            autoFocus
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-5 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </div>
    </Dialog>
  );
}

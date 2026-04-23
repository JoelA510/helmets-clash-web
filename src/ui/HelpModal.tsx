import { Dialog } from './Dialog';

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="How to Play" labelledById="help-title">
      <div className="text-sm space-y-2 text-stone-800">
        <p><b>Goal:</b> Be the last faction with a city standing.</p>
        <p><b>Move:</b> Click or keyboard-select a unit, then click/press Enter on a blue tile to move there.</p>
        <p><b>Attack:</b> Select a red-outlined enemy in range. Melee units counter-attack.</p>
        <p><b>Cards:</b> Spend Orders (refill each turn) on tactical cards.</p>
        <p><b>Your City:</b> Click or press Enter on it to <b>Recruit</b> units or <b>Construct</b> buildings. Food comes from grassland/forest near your city; Granary doubles food output.</p>
        <p><b>Buildings:</b> Each provides a permanent effect — yields, HP, card draw, orders, or vision.</p>

        <h3 className="font-semibold mt-4 text-base">Keyboard controls</h3>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><kbd>Arrow keys</kbd> — move the hex cursor</li>
          <li><kbd>Page Up</kbd> / <kbd>Page Down</kbd> — diagonal hex moves</li>
          <li><kbd>Enter</kbd> or <kbd>Space</kbd> — select / move / attack / open city</li>
          <li><kbd>Esc</kbd> — cancel selection or close dialogs</li>
          <li><kbd>E</kbd> — end your turn</li>
          <li><kbd>Tab</kbd> — jump between map, hand, and toolbar</li>
        </ul>
        <p className="text-xs text-stone-600 italic mt-2">Animations respect your OS reduced-motion preference.</p>
      </div>
    </Dialog>
  );
}

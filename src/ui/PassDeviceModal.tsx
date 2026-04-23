import { Dialog } from './Dialog';

type PassDeviceModalProps = {
  open: boolean;
  seatName: string;
  factionName: string;
  factionGlyph: string;
  factionColor: string;
  onReady: () => void;
};

// Full-screen "pass the device" gate between human seats. Hides map and
// hand state until the next player has taken the device. The dialog is
// non-dismissable — the only way past it is the Ready button.
export function PassDeviceModal({
  open, seatName, factionName, factionGlyph, factionColor, onReady,
}: PassDeviceModalProps) {
  return (
    <Dialog
      open={open}
      onClose={() => { /* not dismissable */ }}
      dismissable={false}
      title="Pass the device"
      labelledById="pass-device-title"
      maxWidth="max-w-md"
    >
      <div className="text-center py-4">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl text-white font-bold mb-4"
          style={{ background: factionColor }}
        >
          {factionGlyph}
        </div>
        <div className="text-lg text-stone-700 mb-1">Next up</div>
        <div className="text-2xl font-bold mb-0.5">{seatName}</div>
        <div className="text-sm text-stone-600 mb-4">Leading {factionName}</div>
        <p className="text-xs text-stone-600 mb-5">
          Hand the device to {seatName}. Other players' hands, unexplored tiles, and decks are hidden until you tap Ready.
        </p>
        <button
          type="button"
          onClick={onReady}
          autoFocus
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-2 rounded shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          I'm ready
        </button>
      </div>
    </Dialog>
  );
}

import type { AISpeed, Theme, UIPrefs } from '../hooks/useUIPrefs';
import { Dialog } from './Dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: UIPrefs;
  setPrefs: (patch: Partial<UIPrefs>) => void;
};

const SPEED_OPTIONS: Array<{ id: AISpeed; label: string; desc: string }> = [
  { id: 'instant', label: 'Instant', desc: 'No delay between AI steps.' },
  { id: 'fast',    label: 'Fast',    desc: '100 ms per AI step.' },
  { id: 'normal',  label: 'Normal',  desc: '300 ms — easy to follow.' },
  { id: 'slow',    label: 'Slow',    desc: '600 ms — for teaching.' },
];

const THEME_OPTIONS: Array<{ id: Theme; label: string; desc: string }> = [
  { id: 'default', label: 'Default', desc: 'Warm parchment palette.' },
  { id: 'hc',      label: 'High contrast', desc: 'Black/white/amber — AAA contrast ratios.' },
];

export function SettingsModal({ open, onClose, prefs, setPrefs }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Settings" labelledById="settings-title" maxWidth="max-w-md">
      <div className="space-y-5 text-sm text-stone-800">
        <fieldset>
          <legend className="font-semibold mb-1">AI pacing</legend>
          <p className="text-xs text-stone-600 mb-2">How quickly AI seats take their turn.</p>
          <div className="grid grid-cols-2 gap-2">
            {SPEED_OPTIONS.map((o) => (
              <label
                key={o.id}
                className={`cursor-pointer rounded border-2 p-2 ${prefs.aiSpeed === o.id ? 'border-amber-600 bg-amber-50' : 'border-stone-300 bg-white'}`}
              >
                <input
                  type="radio"
                  name="ai-speed"
                  value={o.id}
                  checked={prefs.aiSpeed === o.id}
                  onChange={() => setPrefs({ aiSpeed: o.id })}
                  className="sr-only"
                />
                <div className="font-semibold">{o.label}</div>
                <div className="text-xs text-stone-600">{o.desc}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-semibold mb-1">Theme</legend>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((o) => (
              <label
                key={o.id}
                className={`cursor-pointer rounded border-2 p-2 ${prefs.theme === o.id ? 'border-amber-600 bg-amber-50' : 'border-stone-300 bg-white'}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={o.id}
                  checked={prefs.theme === o.id}
                  onChange={() => setPrefs({ theme: o.id })}
                  className="sr-only"
                />
                <div className="font-semibold">{o.label}</div>
                <div className="text-xs text-stone-600">{o.desc}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={prefs.confirmEndTurnWithActions}
            onChange={(e) => setPrefs({ confirmEndTurnWithActions: e.target.checked })}
            className="mt-1"
          />
          <span>
            <div className="font-semibold">Warn on End Turn</div>
            <div className="text-xs text-stone-600">Confirm if any of your units still have actions remaining.</div>
          </span>
        </label>
      </div>
    </Dialog>
  );
}

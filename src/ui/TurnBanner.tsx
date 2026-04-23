import { useEffect, useRef, useState } from 'react';

type Props = {
  turn: number;
  factionName: string;
  factionGlyph: string;
  factionColor: string;
  reducedMotion: boolean;
};

// Short-lived banner that fades in when the active faction changes and
// fades out after ~1.5s. Parent keys this component on (turn, seat) so
// the whole component re-mounts per rotation; `visible` starts true at
// mount and flips false after the timer. Respects prefers-reduced-motion
// by skipping the fade animation class.
export function TurnBanner({ turn, factionName, factionGlyph, factionColor, reducedMotion }: Props) {
  const [visible, setVisible] = useState(true);
  // The timer is scheduled once on mount; we clean it up on unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(false), reducedMotion ? 700 : 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reducedMotion]);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white rounded-lg shadow-xl px-6 py-3 flex items-center gap-3 ${reducedMotion ? '' : 'animate-fade-in-out'}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full text-xl font-bold"
        style={{ background: factionColor }}
      >{factionGlyph}</span>
      <div>
        <div className="text-xs uppercase tracking-wider text-stone-300">Turn {turn}</div>
        <div className="font-bold text-lg">{factionName}</div>
      </div>
    </div>
  );
}

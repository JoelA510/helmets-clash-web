import { useEffect, useState } from 'react';

// User-facing interface preferences. Persisted to localStorage under a
// separate key from the game save so resetting the game doesn't wipe
// them. All fields are optional — older saves without them default
// sensibly.

export type AISpeed = 'instant' | 'fast' | 'normal' | 'slow';
export type Theme = 'default' | 'hc';
export type TutorialState = 'unseen' | 'dismissed';

export type UIPrefs = {
  aiSpeed: AISpeed;
  theme: Theme;
  tutorial: TutorialState;
  // Confirm before ending a turn when units still have available actions.
  confirmEndTurnWithActions: boolean;
};

const STORAGE_KEY = 'helmets-clash:prefs:v1';

const DEFAULTS: UIPrefs = {
  aiSpeed: 'fast',
  theme: 'default',
  tutorial: 'unseen',
  confirmEndTurnWithActions: true,
};

const readStored = (): UIPrefs => {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UIPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
};

const writeStored = (prefs: UIPrefs): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
};

// Millisecond delay between AI actions, keyed by speed preference.
// "instant" is synchronous; the others space each step out so the
// player can follow what happened.
export const AI_SPEED_DELAY: Record<AISpeed, number> = {
  instant: 0,
  fast: 100,
  normal: 300,
  slow: 600,
};

// Hook: read prefs on mount, write on change. Components consume
// `prefs` as read-only; `setPrefs` is a partial updater.
export const useUIPrefs = (): [UIPrefs, (patch: Partial<UIPrefs>) => void] => {
  const [prefs, setPrefsState] = useState<UIPrefs>(() => readStored());
  useEffect(() => { writeStored(prefs); }, [prefs]);
  // Apply the theme attribute on <html> so global CSS rules can react.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);
  const setPrefs = (patch: Partial<UIPrefs>) => setPrefsState((p) => ({ ...p, ...patch }));
  return [prefs, setPrefs];
};

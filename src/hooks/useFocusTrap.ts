import { useEffect, useRef, type RefObject } from 'react';

// Traps focus inside the referenced container while `active` is true.
// Also restores focus to the previously-focused element on unmount.
export const useFocusTrap = (active: boolean): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const prev = document.activeElement as HTMLElement | null;

    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = (): HTMLElement[] =>
      Array.from(node.querySelectorAll<HTMLElement>(selector))
        .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    const first = focusables()[0];
    if (first) first.focus();
    else node.focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (idx <= 0 || idx === -1)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [active]);
  return ref;
};

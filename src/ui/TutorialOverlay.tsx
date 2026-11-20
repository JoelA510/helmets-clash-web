import { useLayoutEffect, useState } from 'react';
import { Dialog } from './Dialog';

const steps = [
  ['goal', 'The objective', 'Keep your city standing and eliminate the rival capitals. The command bar tracks this turn and your resources.'],
  ['unit', 'Your pieces', 'Select a friendly piece to inspect its stats. A check marks a ready unit. Next ready unit cycles through your pieces.'],
  ['terrain', 'Movement and terrain', 'Inspect a hex to see its terrain. Select a unit for its reachable tiles. Forest and hills reduce incoming damage.'],
  ['cards', 'Your hand', 'Orders pay for cards. Select a targeted card to highlight its legal destinations. Cancel keeps the card and its Orders.'],
  ['city', 'Your city', 'Activate your city to recruit or construct. If a unit shares the tile, select it and choose Open city.'],
  ['end', 'End your turn', 'Check income and healing in the inspector. End Turn hands play to the next faction.'],
] as const;

function anchor(index: number) {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${steps[index][0]}"]`);
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const board = el.closest('svg[role=application]')?.getBoundingClientRect();
    if (!board || (rect.left >= board.left && rect.right <= board.right && rect.top >= board.top && rect.bottom <= board.bottom)) return el;
  }
}

function Tour({ onDismiss }: { onDismiss: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect>();
  useLayoutEffect(() => {
    const el = anchor(index);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [index]);
  const next = () => {
    for (let i = index + 1; i < steps.length; i++) {
      if (anchor(i)) { setIndex(i); return; }
    }
    onDismiss();
  };
  return <div className={rect && rect.top + rect.height / 2 > window.innerHeight / 2 ? 'tour tour-top' : 'tour'}>
    {rect && <div aria-hidden="true" className="tour-outline" style={{ top:rect.top, left:rect.left, width:rect.width, height:rect.height }}/>}
    <Dialog open onClose={onDismiss} title="Welcome to Helmets Clash" labelledById="tutorial-title" maxWidth="max-w-sm">
      <h3>{steps[index][1]}</h3><p>{steps[index][2]}</p>
      <div className="tour-buttons"><button onClick={onDismiss}>Got it · Skip tour</button>
        <button className="primary" onClick={next}>{index === steps.length-1 ? 'Finish' : 'Next'}</button></div>
    </Dialog>
  </div>;
}

export function TutorialOverlay({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  return open ? <Tour onDismiss={onDismiss}/> : null;
}

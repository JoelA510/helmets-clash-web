import { useState } from 'react';
import { Eye, Heart, Flag, Swords, Coins, Castle, Scroll } from 'lucide-react';
import type { Card, FactionState } from '../game/types';

import { targetLabels } from './cardLabels';

const icons = { march: Flag, rally: Flag, heal: Heart, harvest: Coins, feast: Coins, scout: Eye,
  siege: Castle, muster: Scroll, hex: Swords, sabotage: Coins, ambush: Swords };

type Props = { faction: FactionState; canPlay: boolean; isViewerActive: boolean; selected?: string;
  onPlayCard: (card: Card) => void };

export function HandBar({ faction, canPlay, isViewerActive, selected, onPlayCard }: Props) {
  const [open, setOpen] = useState(() => !window.matchMedia?.('(max-width:600px)').matches);
  return <section className="hand-tray" aria-label="Your hand" data-tour="cards">
    <button type="button" className="hand-toggle" aria-expanded={open} aria-controls="hand-cards" onClick={() => setOpen(!open)}>
      <strong>{faction.displayName}'s hand ({faction.hand.length})</strong><span>{open ? 'Hide' : 'Show'} cards</span>
    </button>
    {open && <div id="hand-cards" className="card-row">
      {faction.hand.length === 0 && <p>No cards in hand.</p>}
      {faction.hand.map(card => {
        const chosen = card.uid === selected;
        const reason = chosen ? 'Selecting target' : !isViewerActive ? 'Not your turn' :
          faction.orders < card.cost ? `Need ${card.cost - faction.orders} more Orders` :
          !canPlay ? (selected ? 'Finish targeting first' : 'Play unavailable') : undefined;
        const Icon = icons[card.id];
        return <button type="button" key={card.uid} className="order-card" aria-disabled={!!reason}
          aria-pressed={chosen} onClick={() => { if (!reason) onPlayCard(card); }}>
          <span className="card-meta"><Icon size={16} aria-hidden="true"/><b>{card.cost} {card.cost === 1 ? 'Order' : 'Orders'}</b></span>
          <strong>{card.name}</strong><small>{targetLabels[card.target]}</small>
          <span>{card.desc}</span>{reason && <em>{reason}</em>}
        </button>;
      })}
      <div className="deck-count">Deck {faction.deck.length}<br/>Discard {faction.discard.length}</div>
    </div>}
  </section>;
}

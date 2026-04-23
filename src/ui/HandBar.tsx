// @ts-nocheck
import React from 'react';

export function HandBar({ faction, canPlay, onPlayCard, isViewerActive }) {
  if (!faction) return null;
  return (
    <section
      aria-label="Your hand"
      className="mt-3 bg-gradient-to-b from-amber-100 to-amber-50 rounded-lg border-2 border-amber-300 p-3 shadow-inner"
    >
      <div className="text-xs uppercase tracking-wider text-amber-900 mb-2 font-semibold flex items-center justify-between">
        <span>{faction.displayName}'s hand</span>
        <span aria-live="polite">Orders: <b>{faction.orders}</b></span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {faction.hand.length === 0 && (
          <div className="text-sm text-stone-700 italic">No cards in hand.</div>
        )}
        {faction.hand.map((card) => {
          const playable = canPlay && faction.orders >= card.cost && isViewerActive;
          const reason = !isViewerActive ? "Not your turn" : faction.orders < card.cost ? `Need ${card.cost} orders` : !canPlay ? 'Cannot play right now' : null;
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => onPlayCard(card)}
              disabled={!playable}
              aria-describedby={reason ? `card-${card.uid}-reason` : undefined}
              className={`relative shrink-0 w-36 h-28 rounded-lg border-2 p-2 text-left transition transform focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${playable ? 'bg-gradient-to-b from-white to-amber-50 border-amber-700 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none' : 'bg-stone-200 border-stone-400 opacity-60 cursor-not-allowed'}`}
            >
              <div className="absolute top-1 right-1 bg-indigo-800 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold" aria-label={`Costs ${card.cost} orders`}>{card.cost}</div>
              <div className="text-sm font-bold text-stone-900 pr-5">{card.name}</div>
              <div className="text-xs text-stone-800 mt-1">{card.desc}</div>
              {reason && <div id={`card-${card.uid}-reason`} className="sr-only">{reason}</div>}
            </button>
          );
        })}
        <div className="shrink-0 self-center text-xs text-stone-700 pl-2 border-l border-stone-300 ml-2">
          <div>Deck: {faction.deck.length}</div>
          <div>Discard: {faction.discard.length}</div>
        </div>
      </div>
    </section>
  );
}

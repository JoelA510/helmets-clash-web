// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameScreen } from '../../ui/GameScreen';
import { FACTION_PRESETS } from '../../game/constants';
import type { GameConfig, SeatKind } from '../../game/types';
import { mkConfig } from '../helpers';

const PREFS_KEY = 'helmets-clash:prefs:v1';

// Every seat layout the setup screen lets a player start: four seats, each
// human, AI or empty, with at least two non-empty and at least one human.
const KINDS: SeatKind[] = ['human', 'ai', 'empty'];
const layouts: SeatKind[][] = [];
for (const a of KINDS) for (const b of KINDS) for (const c of KINDS) for (const d of KINDS) {
  const l = [a, b, c, d];
  if (l.filter((k) => k !== 'empty').length >= 2 && l.includes('human')) layouts.push(l);
}

const configFor = (layout: SeatKind[]): GameConfig => mkConfig({
  seed: 5,
  seats: layout.map((kind, i) => ({
    kind,
    name: kind === 'empty' ? '' : `${kind === 'human' ? 'Player' : 'AI'} ${i + 1}`,
    factionPresetId: FACTION_PRESETS[i].id,
  })),
});

describe('GameScreen opens on the first human for every startable seat layout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ aiSpeed: 'instant', theme: 'default', tutorial: 'dismissed' }));
  });
  afterEach(cleanup);

  it('covers the layouts the setup screen allows, leading-AI ones included', () => {
    expect(layouts).toHaveLength(61);
    expect(layouts.some((l) => l[0] === 'ai')).toBe(true);
  });

  it.each(layouts.map((l) => [l.join(' / '), l] as const))('%s', (_name, layout) => {
    render(<GameScreen config={configFor(layout)} onExit={() => {}} />);
    const firstHuman = layout.indexOf('human') + 1;
    const header = screen.getByText(/^Turn 1 · /);
    expect(header).toHaveTextContent(`Turn 1 · Player ${firstHuman}`);
    expect(header).not.toHaveTextContent('(waiting)');
    expect(screen.getByRole('button', { name: /end turn \(e\)/i })).toBeEnabled();
  });
});

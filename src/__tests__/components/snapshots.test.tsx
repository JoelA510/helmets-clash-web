// @vitest-environment jsdom
// Snapshot tests for stable UI surfaces. Unlike the assertive component
// tests, these pin the rendered HTML structure so unintentional markup
// drift fails fast. We DON'T snapshot classes that change with theme,
// just the structural output — modals should always emit a role/label
// shape regardless of palette.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Dialog } from '../../ui/Dialog';
import { HelpModal } from '../../ui/HelpModal';
import { PassDeviceModal } from '../../ui/PassDeviceModal';
import { TurnBanner } from '../../ui/TurnBanner';
import { TutorialOverlay } from '../../ui/TutorialOverlay';

afterEach(cleanup);

describe('component snapshots', () => {
  it('Dialog primitive — open, non-dismissable', () => {
    const { container } = render(
      <Dialog open title="Confirm" labelledById="snap-d-title" dismissable={false}>
        <p>Body text.</p>
      </Dialog>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('HelpModal', () => {
    const { container } = render(<HelpModal open onClose={() => {}} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('PassDeviceModal', () => {
    const { container } = render(
      <PassDeviceModal
        open
        seatName="Player 2"
        factionName="Grimhold"
        factionGlyph="☠"
        factionColor="#8b6a8b"
        onReady={() => {}}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('TurnBanner', () => {
    const { container } = render(
      <TurnBanner
        turn={3}
        factionName="Aldermere"
        factionGlyph="♔"
        factionColor="#d6b876"
        reducedMotion
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('TutorialOverlay', () => {
    const { container } = render(<TutorialOverlay open onDismiss={() => {}} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

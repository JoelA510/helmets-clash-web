// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { NewGameScreen } from '../../ui/NewGameScreen';
import { Dialog } from '../../ui/Dialog';
import { HelpModal } from '../../ui/HelpModal';
import { PassDeviceModal } from '../../ui/PassDeviceModal';

afterEach(cleanup);

// Run axe against a container and fail the test if any violations at
// the given severity or higher are found. We scope each run to WCAG
// 2.1 / 2.2 A + AA rules and skip the landmark / region rules because
// the PR-side surfaces (modals, banners) don't need full-page landmarks.
const auditContainer = async (
  root: HTMLElement,
  includeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
) => {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: includeTags },
    // The modals are self-contained in the test render and don't need a
    // <main>/<nav> landmark; likewise color-contrast on pattern fills
    // confuses axe in jsdom (no computed styles for SVG gradients).
    rules: {
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
};

describe('a11y: axe audit of key surfaces', () => {
  it('NewGameScreen passes axe WCAG A+AA rules', async () => {
    const { container } = render(<NewGameScreen onStart={() => {}} />);
    const violations = await auditContainer(container);
    if (violations.length) {
      console.error('axe violations:', JSON.stringify(violations, null, 2));
    }
    expect(violations).toEqual([]);
  });

  it('HelpModal passes axe WCAG A+AA rules', async () => {
    const { container } = render(<HelpModal open onClose={() => {}} />);
    const violations = await auditContainer(container);
    if (violations.length) console.error('axe violations:', JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  });

  it('Dialog primitive (non-dismissable) passes axe WCAG A+AA rules', async () => {
    const { container } = render(
      <Dialog open title="Confirm" labelledById="c-title" dismissable={false}>
        <p>Body text.</p>
        <button type="button">OK</button>
      </Dialog>
    );
    const violations = await auditContainer(container);
    if (violations.length) console.error('axe violations:', JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  });

  it('PassDeviceModal passes axe WCAG A+AA rules', async () => {
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
    const violations = await auditContainer(container);
    if (violations.length) console.error('axe violations:', JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from '../../ui/Dialog';

afterEach(cleanup);

describe('Dialog', () => {
  it('has role=dialog, aria-modal=true, and an accessible name', () => {
    render(
      <Dialog open title="Setup" labelledById="x-title">
        <p>body</p>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'x-title');
    // aria-labelledby target must exist and carry the title text.
    const title = document.getElementById('x-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Setup');
  });

  it('renders no DOM when open=false', () => {
    render(<Dialog open={false} title="X">body</Dialog>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('invokes onClose on Escape when dismissable', () => {
    const onClose = vi.fn();
    render(<Dialog open title="X" onClose={onClose} dismissable>body</Dialog>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT invoke onClose on Escape when dismissable=false', () => {
    const onClose = vi.fn();
    render(<Dialog open title="X" onClose={onClose} dismissable={false}>body</Dialog>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders a close button only when dismissable', () => {
    const { rerender } = render(
      <Dialog open title="X" onClose={() => {}} dismissable>body</Dialog>
    );
    expect(screen.queryByLabelText('Close dialog')).not.toBeNull();
    rerender(<Dialog open title="X" onClose={() => {}} dismissable={false}>body</Dialog>);
    expect(screen.queryByLabelText('Close dialog')).toBeNull();
  });
});

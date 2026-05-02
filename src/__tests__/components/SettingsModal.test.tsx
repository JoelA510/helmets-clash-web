// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '../../ui/SettingsModal';
import type { UIPrefs } from '../../hooks/useUIPrefs';

const prefs: UIPrefs = {
  aiSpeed: 'slow',
  theme: 'default',
  tutorial: 'dismissed',
  confirmEndTurnWithActions: true,
};

afterEach(cleanup);

describe('SettingsModal', () => {
  it('keeps stored AI speed compatible without rendering no-op AI pacing controls', () => {
    render(<SettingsModal open onClose={() => {}} prefs={prefs} setPrefs={() => {}} />);

    expect(screen.queryByText(/AI pacing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/How quickly AI seats take their turn/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Slow/i })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Theme/i })).toBeInTheDocument();
  });

  it('updates the visible theme setting', async () => {
    const user = userEvent.setup();
    const setPrefs = vi.fn();
    render(<SettingsModal open onClose={() => {}} prefs={prefs} setPrefs={setPrefs} />);

    await user.click(screen.getByRole('radio', { name: /High contrast/i }));
    expect(setPrefs).toHaveBeenCalledWith({ theme: 'hc' });
  });

  it('updates the visible end-turn warning setting', async () => {
    const user = userEvent.setup();
    const setPrefs = vi.fn();
    render(<SettingsModal open onClose={() => {}} prefs={prefs} setPrefs={setPrefs} />);

    await user.click(screen.getByRole('checkbox', { name: /Warn on End Turn/i }));
    expect(setPrefs).toHaveBeenCalledWith({ confirmEndTurnWithActions: false });
  });
});

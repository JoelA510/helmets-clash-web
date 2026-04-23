// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewGameScreen } from '../../ui/NewGameScreen';

afterEach(cleanup);

describe('NewGameScreen', () => {
  it('renders an h1 title and the Seats / Map size / Map type sections', () => {
    render(<NewGameScreen onStart={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Helmets Clash');
    expect(screen.getByText(/^Seats$/)).not.toBeNull();
    expect(screen.getByText(/^Map size$/)).not.toBeNull();
    expect(screen.getByText(/^Map type$/)).not.toBeNull();
  });

  it('starts with 2 non-empty seats (1 human, 1 AI) and the submit button enabled', () => {
    render(<NewGameScreen onStart={() => {}} />);
    // The submit button should be enabled — default config has 2 seats.
    const btn = screen.getByRole('button', { name: /Begin Campaign/i });
    expect(btn).not.toBeDisabled();
  });

  it('cycling all seats to empty surfaces an alert and disables start', async () => {
    const user = userEvent.setup();
    render(<NewGameScreen onStart={() => {}} />);
    // The seat-kind buttons are labeled "Change seat N kind; currently Human/AI/Empty".
    // Cycling human → ai → empty needs 2 clicks; AI → empty needs 1.
    const seat1Btn = screen.getByLabelText(/Change seat 1 kind; currently Human/i);
    await user.click(seat1Btn); // human → ai
    const seat1AiBtn = screen.getByLabelText(/Change seat 1 kind; currently AI/i);
    await user.click(seat1AiBtn); // ai → empty
    const seat2Btn = screen.getByLabelText(/Change seat 2 kind; currently AI/i);
    await user.click(seat2Btn); // ai → empty

    expect(screen.getByRole('alert')).toHaveTextContent(/at least two non-empty seats/i);
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled();
  });

  it('shows resume banner only when canResume=true', () => {
    const { rerender } = render(<NewGameScreen onStart={() => {}} canResume={false} />);
    expect(screen.queryByText(/Game in progress/i)).toBeNull();
    rerender(<NewGameScreen onStart={() => {}} canResume onResume={() => {}} onDiscardSave={() => {}} />);
    expect(screen.queryByText(/Game in progress/i)).not.toBeNull();
  });

  it('onStart is invoked with a completed config when submitted', () => {
    const onStart = vi.fn();
    render(<NewGameScreen onStart={onStart} />);
    const form = screen.getByRole('button', { name: /Begin Campaign/i }).closest('form')!;
    fireEvent.submit(form);
    expect(onStart).toHaveBeenCalledTimes(1);
    const arg = onStart.mock.calls[0][0];
    expect(arg.mapSize).toBe('medium');
    expect(arg.mapType).toBe('continents');
    expect(typeof arg.seed).toBe('number');
    expect(arg.seats.filter((s: { kind: string }) => s.kind !== 'empty').length).toBe(2);
  });
});

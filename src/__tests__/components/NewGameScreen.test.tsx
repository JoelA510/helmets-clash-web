// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewGameScreen } from '../../ui/NewGameScreen';
import { FACTION_PRESETS } from '../../game/constants';

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
    const btn = screen.getByRole('button', { name: /Begin Campaign/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows all faction choices in active-seat faction selection UI', () => {
    render(<NewGameScreen onStart={() => {}} />);

    for (const preset of FACTION_PRESETS) {
      expect(screen.getByLabelText(`Seat 1 faction ${preset.name} ${preset.glyph}`)).toBeInTheDocument();
    }
  });

  it('allows changing a seat faction from default to Moonwatch', async () => {
    const user = userEvent.setup();
    render(<NewGameScreen onStart={() => {}} />);

    const moonwatch = FACTION_PRESETS.find((preset) => preset.name === 'Moonwatch');
    expect(moonwatch).toBeTruthy();

    await user.click(screen.getByLabelText(`Seat 1 faction ${moonwatch!.name} ${moonwatch!.glyph}`));

    expect(screen.getByText(new RegExp(`Seat 1 .* ${moonwatch!.name}`))).toBeInTheDocument();
  });

  it('submits selected factionPresetId values through onStart config', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<NewGameScreen onStart={onStart} />);

    const seat1Preset = FACTION_PRESETS.find((preset) => preset.name === 'Moonwatch')!;
    await user.click(screen.getByLabelText(`Seat 1 faction ${seat1Preset.name} ${seat1Preset.glyph}`));

    const seat2Button = screen.getByLabelText(/Change seat 2 kind; currently AI/i);
    await user.click(seat2Button); // ai -> empty
    const seat2EmptyButton = screen.getByLabelText(/Change seat 2 kind; currently Empty/i);
    await user.click(seat2EmptyButton); // empty -> human

    const seat2Preset = FACTION_PRESETS.find((preset) => preset.id !== seat1Preset.id)!;
    await user.click(screen.getByLabelText(`Seat 2 faction ${seat2Preset.name} ${seat2Preset.glyph}`));

    fireEvent.submit(screen.getByRole('button', { name: /Begin Campaign/i }).closest('form')!);

    expect(onStart).toHaveBeenCalledTimes(1);
    const arg = onStart.mock.calls[0][0];
    expect(arg.seats[0].factionPresetId).toBe(seat1Preset.id);
    expect(arg.seats[1].factionPresetId).toBe(seat2Preset.id);
  });

  it('links faction help text via aria-describedby on faction radio cards', () => {
    render(<NewGameScreen onStart={() => {}} />);

    const moonwatch = FACTION_PRESETS.find((preset) => preset.name === 'Moonwatch')!;
    const moonwatchCard = screen.getByLabelText(`Seat 1 faction ${moonwatch.name} ${moonwatch.glyph}`).closest('label');
    expect(moonwatchCard).not.toBeNull();

    const describedBy = moonwatchCard!.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(moonwatch.tooltip);
  });

  it('disables duplicate faction options for other active seats', () => {
    render(<NewGameScreen onStart={() => {}} />);

    const seat1Selected = FACTION_PRESETS[0];
    const seat2SameFaction = screen.getByLabelText(`Seat 2 faction ${seat1Selected.name} ${seat1Selected.glyph}`);
    expect(seat2SameFaction.closest('label')).toHaveClass('cursor-not-allowed');
    expect((seat2SameFaction.closest('label')?.querySelector('input[type="radio"]') as HTMLInputElement).disabled).toBe(true);
  });

  it('reports duplicate active factions from initial config and disables start', () => {
    const duplicatePreset = FACTION_PRESETS[0];
    const duplicateInitialConfig = {
      mapSize: 'medium' as const,
      mapType: 'continents' as const,
      seats: [
        { kind: 'human' as const, name: 'Player 1', factionPresetId: duplicatePreset.id },
        { kind: 'ai' as const, name: `AI ${duplicatePreset.name}`, factionPresetId: duplicatePreset.id },
        { kind: 'empty' as const, name: '', factionPresetId: FACTION_PRESETS[2].id },
        { kind: 'empty' as const, name: '', factionPresetId: FACTION_PRESETS[3].id },
      ],
      seed: 1,
    };

    render(<NewGameScreen onStart={() => {}} initialConfig={duplicateInitialConfig} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Duplicate active factions detected/i);
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled();
  });

  it('ignores empty seats for duplicate validation', async () => {
    const user = userEvent.setup();
    render(<NewGameScreen onStart={() => {}} />);

    const seat2Button = screen.getByLabelText(/Change seat 2 kind; currently AI/i);
    await user.click(seat2Button); // ai -> empty

    expect(screen.queryByText(/Duplicate active factions detected/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled(); // only 1 non-empty seat remains

    const seat1Button = screen.getByLabelText(/Change seat 1 kind; currently Human/i);
    await user.click(seat1Button); // human -> ai

    expect(screen.queryByText(/Duplicate active factions detected/i)).not.toBeInTheDocument();
  });

  it('releases a faction when a seat becomes empty so another active seat can choose it', async () => {
    const user = userEvent.setup();
    render(<NewGameScreen onStart={() => {}} />);

    const seat2CurrentFaction = FACTION_PRESETS[1];
    const seat1Seat2FactionOption = screen.getByLabelText(`Seat 1 faction ${seat2CurrentFaction.name} ${seat2CurrentFaction.glyph}`);
    const seat1Seat2FactionInput = seat1Seat2FactionOption.closest('label')?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(seat1Seat2FactionInput.disabled).toBe(true);

    const seat2Button = screen.getByLabelText(/Change seat 2 kind; currently AI/i);
    await user.click(seat2Button); // ai -> empty

    const releasedInput = screen.getByLabelText(`Seat 1 faction ${seat2CurrentFaction.name} ${seat2CurrentFaction.glyph}`)
      .closest('label')?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(releasedInput.disabled).toBe(false);
  });

  it('keeps AI default naming safe across faction changes and preserves custom names', async () => {
    const user = userEvent.setup();

    render(<NewGameScreen onStart={() => {}} />);
    const seat2NameInput = screen.getByRole('textbox', { name: /Display name for seat 2/i }) as HTMLInputElement;
    expect(seat2NameInput.value).toBe(`AI ${FACTION_PRESETS[1].name}`);

    const seat2DefaultPreset = FACTION_PRESETS[1];
    const seat2NewPreset = FACTION_PRESETS.find((preset) =>
      preset.id !== FACTION_PRESETS[0].id
      && preset.id !== seat2DefaultPreset.id
    )!;
    await user.click(screen.getByLabelText(`Seat 2 faction ${seat2NewPreset.name} ${seat2NewPreset.glyph}`));
    expect(seat2NameInput.value).toBe(`AI ${seat2NewPreset.name}`);

    await user.clear(seat2NameInput);
    await user.type(seat2NameInput, 'Custom Bot Name');

    const anotherPreset = FACTION_PRESETS.find((preset) =>
      preset.id !== FACTION_PRESETS[0].id
      && preset.id !== seat2DefaultPreset.id
      && preset.id !== seat2NewPreset.id
    )!;
    await user.click(screen.getByLabelText(`Seat 2 faction ${anotherPreset.name} ${anotherPreset.glyph}`));
    expect(seat2NameInput.value).toBe('Custom Bot Name');
  });

  it('assigns a sensible default when blank AI names change faction', async () => {
    const user = userEvent.setup();
    render(<NewGameScreen onStart={() => {}} initialConfig={{
      mapSize: 'medium',
      mapType: 'continents',
      seats: [
        { kind: 'human', name: 'Player 1', factionPresetId: FACTION_PRESETS[0].id },
        { kind: 'ai', name: '', factionPresetId: FACTION_PRESETS[1].id },
        { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[2].id },
        { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[3].id },
      ],
      seed: 1,
    }} />);

    const blankAiInput = screen.getByRole('textbox', { name: /Display name for seat 2/i }) as HTMLInputElement;
    expect(blankAiInput.value).toBe('');

    const blankAiSeat2DefaultPreset = FACTION_PRESETS[1];
    const blankAiNewPreset = FACTION_PRESETS.find((preset) =>
      preset.id !== FACTION_PRESETS[0].id
      && preset.id !== blankAiSeat2DefaultPreset.id
    )!;
    await user.click(screen.getByLabelText(`Seat 2 faction ${blankAiNewPreset.name} ${blankAiNewPreset.glyph}`));
    expect(blankAiInput.value).toBe(`AI ${blankAiNewPreset.name}`);
  });

  it('enforces both minimum two non-empty seats and duplicate-free active factions', async () => {
    const user = userEvent.setup();
    const duplicatePreset = FACTION_PRESETS[0];

    render(<NewGameScreen onStart={() => {}} initialConfig={{
      mapSize: 'medium',
      mapType: 'continents',
      seats: [
        { kind: 'human', name: 'Player 1', factionPresetId: duplicatePreset.id },
        { kind: 'ai', name: `AI ${duplicatePreset.name}`, factionPresetId: duplicatePreset.id },
        { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[2].id },
        { kind: 'empty', name: '', factionPresetId: FACTION_PRESETS[3].id },
      ],
      seed: 1,
    }} />);

    expect(screen.getByText(/Duplicate active factions detected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled();

    const seat2Button = screen.getByLabelText(/Change seat 2 kind; currently AI/i);
    await user.click(seat2Button); // ai -> empty

    expect(screen.queryByText(/Duplicate active factions detected/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Need at least two non-empty seats to start/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Campaign/i })).toBeDisabled();
  });

  it('shows resume banner only when canResume=true', () => {
    const { rerender } = render(<NewGameScreen onStart={() => {}} canResume={false} />);
    expect(screen.queryByText(/Game in progress/i)).toBeNull();
    rerender(<NewGameScreen onStart={() => {}} canResume onResume={() => {}} onDiscardSave={() => {}} />);
    expect(screen.queryByText(/Game in progress/i)).not.toBeNull();
  });
});

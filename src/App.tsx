import { useState } from 'react';
import type { GameConfig, GameState } from './game/types';
import { NewGameScreen } from './ui/NewGameScreen';
import { GameScreen } from './ui/GameScreen';
import { clearSave, hasSave, loadGame } from './game/persist';

type ExitMode = 'menu' | 'replay';

// Top-level router: choose between New Game setup and the in-game screen.
// `replay` reuses the same GameConfig with a fresh seed; `menu` returns to
// the setup screen. If a localStorage autosave exists on mount, we offer to
// resume it; otherwise we start at the new-game setup.
export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  // Optional initial state from a localStorage resume. When present, we pass
  // it to GameScreen which will use it in place of a fresh initialState.
  const [resumeState, setResumeState] = useState<GameState | null>(() => {
    return hasSave() ? loadGame() : null;
  });
  const [gameKey, setGameKey] = useState(0);

  // Actively playing a game if either a manual config is set (new game) or
  // a resume state was loaded.
  const inGame = config !== null || resumeState !== null;

  if (!inGame) {
    return (
      <NewGameScreen
        onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }}
        canResume={resumeState !== null}
        onResume={() => setGameKey((k) => k + 1)}
        onDiscardSave={() => { clearSave(); setResumeState(null); }}
      />
    );
  }

  const handleExit = (mode: ExitMode) => {
    clearSave();
    setResumeState(null);
    if (mode === 'replay' && config) {
      setConfig({ ...config, seed: Math.floor(Math.random() * 1_000_000_000) });
      setGameKey((k) => k + 1);
      return;
    }
    setConfig(null);
  };

  // When resuming from save, config is null but resumeState is set.
  // GameScreen uses `initialState` when given `initialState: null` — we
  // pass the resumed state directly as a prop and let it skip initial
  // generation.
  return (
    <GameScreen
      key={gameKey}
      config={config ?? resumeState!.config}
      initialState={resumeState ?? undefined}
      onExit={handleExit}
    />
  );
}

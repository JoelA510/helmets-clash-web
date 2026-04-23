import { useState } from 'react';
import type { GameConfig } from './game/types';
import { NewGameScreen } from './ui/NewGameScreen';
import { GameScreen } from './ui/GameScreen';

type ExitMode = 'menu' | 'replay';

// Top-level router: choose between New Game setup and the in-game screen.
// `replay` reuses the same GameConfig with a fresh seed; `menu` returns to
// the setup screen.
export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <NewGameScreen onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }} />;
  }

  const handleExit = (mode: ExitMode) => {
    if (mode === 'replay') {
      setConfig({ ...config, seed: Math.floor(Math.random() * 1_000_000_000) });
      setGameKey((k) => k + 1);
      return;
    }
    setConfig(null);
  };

  return <GameScreen key={gameKey} config={config} onExit={handleExit} />;
}

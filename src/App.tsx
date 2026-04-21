// @ts-nocheck
import React, { useState } from 'react';
import { NewGameScreen } from './ui/NewGameScreen';
import { GameScreen } from './ui/GameScreen';

// Top-level router: choose between New Game setup and the in-game screen.
// `replay` reuses the same GameConfig (with a fresh seed); `menu` returns to
// the setup screen.
export default function App() {
  const [config, setConfig] = useState(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <NewGameScreen onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }} />;
  }

  const handleExit = (mode) => {
    if (mode === 'replay') {
      // Reuse the same config but freshen the seed so the map differs.
      setConfig({ ...config, seed: Math.floor(Math.random() * 1_000_000_000) });
      setGameKey((k) => k + 1);
      return;
    }
    setConfig(null);
  };

  return <GameScreen key={gameKey} config={config} onExit={handleExit} />;
}

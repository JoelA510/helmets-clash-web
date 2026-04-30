import { useState } from 'react';
import type { GameConfig, GameState } from './game/types';
import { NewGameScreen } from './ui/NewGameScreen';
import { GameScreen } from './ui/GameScreen';
import { clearSave, hasSave, loadGame } from './game/persist';

type ExitMode = 'menu' | 'replay';
type AppMode = 'setup' | 'playing';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('setup');
  const [activeConfig, setActiveConfig] = useState<GameConfig | null>(null);
  const [activeInitialState, setActiveInitialState] = useState<GameState | undefined>(undefined);
  const [availableResumeState, setAvailableResumeState] = useState<GameState | null>(() => {
    return hasSave() ? loadGame() : null;
  });
  const [gameKey, setGameKey] = useState(0);

  const startFreshFromConfig = (baseConfig: GameConfig) => {
    setActiveConfig({
      ...baseConfig,
      seed: Math.floor(Math.random() * 1_000_000_000),
    });
    setActiveInitialState(undefined);
    setGameKey((k) => k + 1);
    setAppMode('playing');
  };

  const handleStart = (config: GameConfig) => {
    setActiveConfig(config);
    setActiveInitialState(undefined);
    setGameKey((k) => k + 1);
    setAppMode('playing');
  };

  const handleResume = () => {
    if (!availableResumeState) return;
    setActiveConfig(availableResumeState.config);
    setActiveInitialState(availableResumeState);
    setGameKey((k) => k + 1);
    setAppMode('playing');
  };

  const handleDiscardSave = () => {
    clearSave();
    setAvailableResumeState(null);
    setAppMode('setup');
  };

  const handleExit = (mode: ExitMode) => {
    const replayConfigSource = activeConfig ?? activeInitialState?.config ?? availableResumeState?.config ?? null;
    clearSave();
    setAvailableResumeState(null);

    if (mode === 'replay' && replayConfigSource) {
      startFreshFromConfig(replayConfigSource);
      return;
    }

    setActiveConfig(null);
    setActiveInitialState(undefined);
    setAppMode('setup');
  };

  if (appMode === 'setup') {
    return (
      <NewGameScreen
        onStart={handleStart}
        canResume={availableResumeState !== null}
        onResume={handleResume}
        onDiscardSave={handleDiscardSave}
      />
    );
  }

  if (!activeConfig) {
    return null;
  }

  return (
    <GameScreen
      key={gameKey}
      config={activeConfig}
      initialState={activeInitialState}
      onExit={handleExit}
    />
  );
}

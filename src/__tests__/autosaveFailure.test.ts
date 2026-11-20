import { afterEach, expect, it, vi } from 'vitest';
import { clearSave, debouncedSaveGame, flushPendingSave, hasSave, loadGame, saveGame } from '../game/persist';
import { initialState } from '../game/state';
import { mkConfig } from './helpers';

afterEach(() => { vi.unstubAllGlobals(); });

it('survives a storage getter denied by the browser', () => {
  vi.stubGlobal('window',{get localStorage() { throw new Error('Storage disabled'); }});
  expect(hasSave()).toBe(false);
  expect(loadGame()).toBeNull();
  expect(saveGame(initialState(mkConfig()))).toBe(false);
  expect(clearSave).not.toThrow();
});

it('preserves the last good save on quota failure and retries the latest turn', () => {
  let stored = '', full = false;
  vi.stubGlobal('window',{localStorage:{getItem:() => stored,setItem:(_:string,value:string) => {
    if (full) throw new Error('Quota exceeded');
    stored = value;
  }}});
  const state = initialState(mkConfig());
  expect(saveGame(state)).toBe(true);
  const report = vi.fn();
  full = true;
  debouncedSaveGame({...state,turn:2},report);
  flushPendingSave();
  expect(report).toHaveBeenLastCalledWith(false);
  expect(loadGame()?.turn).toBe(1);
  full = false;
  debouncedSaveGame({...state,turn:3},report);
  flushPendingSave();
  expect(report).toHaveBeenLastCalledWith(true);
  expect(loadGame()?.turn).toBe(3);
});

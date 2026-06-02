import { load, save } from './storage';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Settings {
  difficulty: Difficulty;
  sound: boolean;
  startLevel: number; // 1-based; capped by progress
}

const KEY = 'ultra-balloon-settings';

const DEFAULTS: Settings = {
  difficulty: 'medium',
  sound: true,
  startLevel: 1,
};

export interface Progress {
  highestLevel: number; // highest level reached (unlocks level select)
}

const PROGRESS_KEY = 'ultra-balloon-progress';
const PROGRESS_DEFAULTS: Progress = { highestLevel: 1 };

export function loadSettings(): Settings {
  return load<Settings>(KEY, DEFAULTS);
}

export function saveSettings(s: Settings): void {
  save(KEY, s);
}

export function loadProgress(): Progress {
  return load<Progress>(PROGRESS_KEY, PROGRESS_DEFAULTS);
}

export function saveProgress(p: Progress): void {
  save(PROGRESS_KEY, p);
}

/** Swing-speed multiplier per difficulty (the original alters how fast the balloon swings). */
export const SWING_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 0.72,
  medium: 1.0,
  hard: 1.35,
};

import { LevelData } from './level-data';
import level1 from '../data/extracted/level1.json';

const LEVELS: Record<number, LevelData> = {
  1: level1 as unknown as LevelData,
};

export const MAX_LEVEL = 1;

/** Levels loop back to 1 ("next lap") until a registered ROM adds levels 2–10. */
export function loadLevel(n: number): LevelData {
  const idx = ((n - 1) % MAX_LEVEL) + 1;
  return LEVELS[idx];
}

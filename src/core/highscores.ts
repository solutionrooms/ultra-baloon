import { load, save } from './storage';

export interface HighScore {
  name: string;
  score: number;
  level: number;
}

const KEY = 'ultra-balloon-highscores';
const MAX = 10;

const SEED: HighScore[] = [
  { name: 'JUL', score: 12000, level: 3 },
  { name: 'MAD', score: 9000, level: 2 },
  { name: 'AIR', score: 6000, level: 2 },
  { name: 'POP', score: 4000, level: 1 },
  { name: 'SKY', score: 2000, level: 1 },
];

interface Store {
  scores: HighScore[];
}

export function loadHighScores(): HighScore[] {
  const s = load<Store>(KEY, { scores: SEED });
  return [...s.scores].sort((a, b) => b.score - a.score).slice(0, MAX);
}

export function qualifies(score: number): boolean {
  const scores = loadHighScores();
  return score > 0 && (scores.length < MAX || score > scores[scores.length - 1].score);
}

export function addHighScore(entry: HighScore): HighScore[] {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX);
  save<Store>(KEY, { scores: trimmed });
  return trimmed;
}

export function resetHighScores(): void {
  save<Store>(KEY, { scores: SEED });
}

/** Flavour title based on top score, in the spirit of the original arcade high-score lists. */
export function rankTitle(score: number): string {
  if (score >= 50000) return 'BALLOON ACE';
  if (score >= 25000) return 'SKY MASTER';
  if (score >= 12000) return 'PILOT';
  if (score >= 5000) return 'DRIFTER';
  return 'ROOKIE';
}

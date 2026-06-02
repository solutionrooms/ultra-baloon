import physicsJson from '../data/extracted/physics.json';
import scoringJson from '../data/extracted/scoring.json';

export interface Physics {
  balloonRadius: number;
  moveSpeed: number;
  responsiveness: number;
  swing: { velAmplitude: number; angularFreqBase: number };
  slowMoFactor: number;
  pushDecayPerSec: number;
  blowerForce: number;
  blowerIdleSeconds: number;
}

export interface Scoring {
  flagA: number;
  flagB: number;
  extraLifeEvery: number;
  timerStart: number;
  timeBonusPerUnit: number;
  bonusRoomPerDiamond: number;
  bonusLevelDiamondBase: number;
  bonusLevelDiamondStep: number;
  startingLives: number;
}

export const PHYSICS: Physics = physicsJson as unknown as Physics;
export const SCORING: Scoring = scoringJson as unknown as Scoring;

/** Recovered timer rate: 25 fps with a decrement every 4 frames = 6.25 units/sec
 * (re/FINDINGS.md §3.2/§3.3) → the 999-unit timer lasts ~160s/level. */
export const TIMER_UNITS_PER_SEC = 6.25;

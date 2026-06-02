import { LevelData, Nasty, MovingWall, Launcher, Dir } from './level-data';
import { maskToRects, b64ToBytes } from './maze';
import levelsJson from '../data/extracted/levels.json';
import m0 from '../data/extracted/maze0.json';
import m1 from '../data/extracted/maze1.json';
import m2 from '../data/extracted/maze2.json';
import m3 from '../data/extracted/maze3.json';
import m4 from '../data/extracted/maze4.json';
import m5 from '../data/extracted/maze5.json';
import m6 from '../data/extracted/maze6.json';
import m7 from '../data/extracted/maze7.json';
import m8 from '../data/extracted/maze8.json';
import m9 from '../data/extracted/maze9.json';

interface MazeJson {
  width: number;
  height: number;
  rowBytes: number;
  mask: string;
}
interface Pt {
  x: number;
  y: number;
}
interface HazardObj {
  x: number;
  y: number;
  type: number;
  subtype: number;
  param: number;
}
interface RawLevel {
  id: number;
  width: number;
  height: number;
  spawn: Pt;
  goal: Pt;
  flagA: Pt;
  flagB: Pt;
  cond: Pt | null;
  hazards: HazardObj[];
}

const MAZES = [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9] as unknown as MazeJson[];
const RAW = (levelsJson as unknown as { levels: RawLevel[] }).levels;

export const MAX_LEVEL = 10;

const NAMES = [
  'FIRST FLIGHT',
  'UPDRAFT',
  'CROSSWINDS',
  'THE GAUNTLET',
  'PINBALL',
  'TIGHT SQUEEZE',
  'THE LONG HAUL',
  'DART ALLEY',
  'VERTIGO',
  'MAD BALLOON',
];

/** Cache built levels so we don't recompute the (cheap-ish) wall decomposition each lap. */
const cache = new Map<number, LevelData>();

function mapLauncher(h: HazardObj, width: number): Launcher {
  let dir: Dir = 'down';
  if (h.x >= width - 20) dir = 'left';
  else if (h.x <= 20) dir = 'right';
  else dir = h.y < 40 ? 'down' : 'down';
  const lo = h.param & 0xff;
  const hi = (h.param >> 8) & 0xff;
  const speed = lo >= 30 && lo <= 200 ? Math.min(90, lo * 0.45 + 35) : 60;
  const interval = 1.9 + (hi % 8) * 0.28;
  return { x: h.x, y: h.y, dir, interval, speed, kind: 'splat' };
}

function mapMover(h: HazardObj): MovingWall {
  // sub 1 ~ horizontal bar, sub 0 ~ vertical bar (best-effort; positions are exact)
  if (h.subtype === 1) {
    return { x: h.x, y: h.y, w: 28, h: 8, axis: 'x', amplitude: 22, speed: 1.3, phase: 0 };
  }
  return { x: h.x, y: h.y, w: 8, h: 28, axis: 'y', amplitude: 22, speed: 1.2, phase: 0 };
}

function buildLevel(n: number): LevelData {
  const idx = ((n - 1) % MAX_LEVEL + MAX_LEVEL) % MAX_LEVEL;
  if (cache.has(idx)) return cache.get(idx)!;

  const src = RAW[idx];
  const mz = MAZES[idx];
  const walls = maskToRects(b64ToBytes(mz.mask), mz.width, mz.height, mz.rowBytes);

  const nasties: Nasty[] = [];
  const movingWalls: MovingWall[] = [];
  const launchers: Launcher[] = [];

  for (const h of src.hazards) {
    switch (h.type) {
      case 5: // static nasty (sprite 31)
      case 12: // sprite-43 object — treat as a static nasty
        nasties.push({ x: h.x, y: h.y, radius: 6 });
        break;
      case 9: // phased/moving nasty (sprite 34)
        nasties.push({
          x: h.x,
          y: h.y,
          radius: 6,
          oscAxis: h.subtype >= 100 ? 'y' : 'x',
          oscAmp: 16,
          oscSpeed: 1.4,
          phase: (h.subtype % 100) * 0.12,
        });
        break;
      case 7: // launcher / darts
        launchers.push(mapLauncher(h, src.width));
        break;
      case 1: // moving wall / platform
        movingWalls.push(mapMover(h));
        break;
      default:
        nasties.push({ x: h.x, y: h.y, radius: 6 });
    }
  }

  const level: LevelData = {
    id: src.id,
    name: NAMES[idx] ?? `LEVEL ${src.id}`,
    width: src.width,
    height: src.height,
    spawn: { x: src.spawn.x, y: src.spawn.y },
    goal: { x: src.goal.x - 9, y: src.goal.y - 9, w: 18, h: 18 },
    flagA: { x: src.flagA.x, y: src.flagA.y },
    flagB: { x: src.flagB.x, y: src.flagB.y },
    walls,
    spikes: [],
    movingWalls,
    pipes: [],
    launchers,
    nasties,
    spikyBallOnFlagA: !!src.cond,
    spikyBall: src.cond ? { x: src.cond.x, y: src.cond.y, speed: 34 } : undefined,
  };
  cache.set(idx, level);
  return level;
}

/** Levels loop back to 1 ("next lap") after level 10. */
export function loadLevel(n: number): LevelData {
  return buildLevel(n);
}

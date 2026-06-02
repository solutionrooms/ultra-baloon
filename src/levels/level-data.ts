export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MovingWall extends Rect {
  axis: 'x' | 'y';
  amplitude: number; // travel distance (world units) each way
  speed: number; // radians/sec of the oscillation
  phase?: number; // initial phase
}

export interface Pipe {
  x: number; // drip origin
  y: number;
  interval: number; // seconds between drips
  dropSpeed: number; // world units/sec
}

export interface Launcher {
  x: number;
  y: number;
  dir: Dir;
  interval: number; // seconds between shots
  speed: number; // projectile speed
  kind: 'splat' | 'dart';
}

export interface SpikyBall {
  x: number;
  y: number;
  speed: number; // homing speed once active
}

/** A fatal nasty — stationary (osc fields absent) or oscillating along an axis. */
export interface Nasty {
  x: number;
  y: number;
  radius: number;
  oscAxis?: 'x' | 'y';
  oscAmp?: number;
  oscSpeed?: number;
  phase?: number;
}

export interface LevelData {
  id: number;
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  goal: Rect;
  flagA: { x: number; y: number };
  flagB: { x: number; y: number };
  walls: Rect[];
  spikes: Rect[]; // fatal hazard strips
  movingWalls: MovingWall[];
  pipes: Pipe[];
  launchers: Launcher[];
  nasties: Nasty[];
  spikyBallOnFlagA: boolean;
  spikyBall?: SpikyBall;
}

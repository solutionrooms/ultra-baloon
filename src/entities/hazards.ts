import { LevelData, Rect } from '../levels/level-data';
import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';
import { circleHitsAnyRect } from '../levels/maze';
import { circleCircle } from '../math/collision';
import { Audio } from '../core/audio';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: 'drop' | 'splat' | 'dart';
}

/** Runtime state for a level's dynamic hazards. */
export class HazardField {
  projectiles: Projectile[] = [];
  movingWallRects: Rect[] = [];
  private phase = 0;
  private pipeTimers: number[] = [];
  private launcherTimers: number[] = [];

  constructor(private readonly level: LevelData) {
    this.reset();
  }

  reset(): void {
    this.projectiles.length = 0;
    this.phase = 0;
    this.pipeTimers = this.level.pipes.map((p, i) => p.interval * (0.3 + 0.2 * i));
    this.launcherTimers = this.level.launchers.map((l, i) => l.interval * (0.5 + 0.15 * i));
    this.computeMovingWalls();
  }

  private computeMovingWalls(): void {
    this.movingWallRects = this.level.movingWalls.map((m) => {
      const off = Math.sin(this.phase * m.speed + (m.phase ?? 0)) * m.amplitude;
      return {
        x: m.x + (m.axis === 'x' ? off : 0),
        y: m.y + (m.axis === 'y' ? off : 0),
        w: m.w,
        h: m.h,
      };
    });
  }

  update(dt: number, audio: Audio, soundOn: boolean): void {
    this.phase += dt;
    this.computeMovingWalls();

    // pipes drip
    this.level.pipes.forEach((p, i) => {
      this.pipeTimers[i] -= dt;
      if (this.pipeTimers[i] <= 0) {
        this.pipeTimers[i] = p.interval;
        this.projectiles.push({ x: p.x, y: p.y, vx: 0, vy: p.dropSpeed, r: 3, kind: 'drop' });
      }
    });

    // launchers fire
    this.level.launchers.forEach((l, i) => {
      this.launcherTimers[i] -= dt;
      if (this.launcherTimers[i] <= 0) {
        this.launcherTimers[i] = l.interval;
        const v = { x: 0, y: 0 };
        if (l.dir === 'left') v.x = -l.speed;
        else if (l.dir === 'right') v.x = l.speed;
        else if (l.dir === 'up') v.y = -l.speed;
        else v.y = l.speed;
        this.projectiles.push({
          x: l.x,
          y: l.y,
          vx: v.x,
          vy: v.y,
          r: l.kind === 'dart' ? 3 : 4,
          kind: l.kind,
        });
        if (soundOn) audio.play('launch');
      }
    });

    // move projectiles; cull off-bounds or hitting a static wall
    const { width, height, walls } = this.level;
    this.projectiles = this.projectiles.filter((pr) => {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.x < -10 || pr.x > width + 10 || pr.y < -10 || pr.y > height + 10) return false;
      if (circleHitsAnyRect(pr.x, pr.y, pr.r * 0.5, walls)) return false;
      return true;
    });
  }

  /** Fatal if the balloon overlaps any projectile. */
  hits(bx: number, by: number, br: number): boolean {
    for (const pr of this.projectiles) {
      if (circleCircle(bx, by, br, pr.x, pr.y, pr.r)) return true;
    }
    return false;
  }

  render(r: Renderer): void {
    const { ctx } = r;
    // moving walls
    for (const m of this.movingWallRects) {
      r.worldRect(m.x, m.y, m.w, m.h, PALETTE.mid);
      r.worldRectOutline(m.x, m.y, m.w, m.h, PALETTE.ink, Math.max(1, r.sl(1)));
    }
    // pipes (origins)
    for (const p of this.level.pipes) {
      r.worldRect(p.x - 5, p.y - 6, 10, 6, PALETTE.ink);
    }
    // launchers (origins)
    for (const l of this.level.launchers) {
      r.worldCircle(l.x, l.y, 5, PALETTE.ink);
    }
    // projectiles
    for (const pr of this.projectiles) {
      ctx.fillStyle = PALETTE.ink;
      if (pr.kind === 'dart') {
        const ang = Math.atan2(pr.vy, pr.vx);
        const cx = r.sx(pr.x);
        const cy = r.sy(pr.y);
        const len = r.sl(7);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(-len * 0.5, -len * 0.35);
        ctx.lineTo(-len * 0.5, len * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        r.worldCircle(pr.x, pr.y, pr.r, PALETTE.ink);
      }
    }
  }
}

import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';
import { SpikyBall as SpikyBallData } from '../levels/level-data';

/** Spawns when flag A is collected (on flagged levels); homes toward the balloon; removed by flag B. */
export class SpikyBall {
  active = false;
  x = 0;
  y = 0;
  radius = 8;
  private spin = 0;
  private speed: number;
  private spawn: { x: number; y: number };

  constructor(data: SpikyBallData) {
    this.spawn = { x: data.x, y: data.y };
    this.speed = data.speed;
  }

  reset(): void {
    this.active = false;
    this.x = this.spawn.x;
    this.y = this.spawn.y;
  }

  activate(): void {
    this.active = true;
    this.x = this.spawn.x;
    this.y = this.spawn.y;
  }

  update(dt: number, targetX: number, targetY: number): void {
    if (!this.active) return;
    this.spin += dt * 3;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * this.speed * dt;
    this.y += (dy / d) * this.speed * dt;
  }

  render(r: Renderer): void {
    if (!this.active) return;
    const { ctx } = r;
    const cx = r.sx(this.x);
    const cy = r.sy(this.y);
    const rad = r.sl(this.radius);
    ctx.fillStyle = PALETTE.ink;
    const spikes = 8;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const ang = this.spin + (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? rad : rad * 0.55;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}
